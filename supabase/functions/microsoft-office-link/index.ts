import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const officeExtensions = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
const officeKindExtensions: Record<string, string> = {
  word: "docx",
  excel: "xlsx",
  powerpoint: "pptx",
};
const defaultOfficeTitles: Record<string, string> = {
  word: "New Word Document.docx",
  excel: "New Excel Workbook.xlsx",
  powerpoint: "New PowerPoint Presentation.pptx",
};
const uploadChunkSize = 5 * 1024 * 1024;

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

const getExtension = (name: string) => {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.toLowerCase() : "";
};

const getContentType = (extension: string) => {
  const contentTypes: Record<string, string> = {
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  return contentTypes[extension] || "application/octet-stream";
};

const getSafeDriveFileName = (name: string) => {
  const safeName = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, " ").trim();
  return safeName || "document";
};

const encodeDrivePath = (path: string) => {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
};

const getGraphToken = async () => {
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID");
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft Graph environment is not configured.");
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Microsoft Graph access token could not be created.");
  }

  return payload.access_token as string;
};

const getGraphErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.error_description || response.statusText;
  } catch {
    return response.statusText;
  }
};

const graphFetch = async (token: string, path: string, init: RequestInit = {}) => {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await getGraphErrorMessage(response));
  }

  return response;
};

const loadFileBytes = async (serviceClient: any, material: any) => {
  if (material.file_path && !String(material.file_path).startsWith("http")) {
    const { data, error } = await serviceClient.storage
      .from("course_content")
      .download(material.file_path);

    if (error || !data) throw new Error(error?.message || "File could not be downloaded from storage.");
    return new Uint8Array(await data.arrayBuffer());
  }

  const fileUrl = material.file_url || material.file_path;
  if (!fileUrl) throw new Error("This file does not have a downloadable source.");

  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error("File could not be downloaded from its public URL.");

  return new Uint8Array(await response.arrayBuffer());
};

const uploadSmallFile = async (
  token: string,
  driveId: string,
  drivePath: string,
  fileBytes: Uint8Array,
  contentType: string,
) => {
  const response = await graphFetch(
    token,
    `/drives/${encodeURIComponent(driveId)}/root:/${encodeDrivePath(drivePath)}:/content`,
    {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fileBytes,
    },
  );

  return await response.json();
};

const uploadLargeFile = async (
  token: string,
  driveId: string,
  drivePath: string,
  fileBytes: Uint8Array,
) => {
  const sessionResponse = await graphFetch(
    token,
    `/drives/${encodeURIComponent(driveId)}/root:/${encodeDrivePath(drivePath)}:/createUploadSession`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "replace",
        },
      }),
    },
  );
  const session = await sessionResponse.json();
  if (!session.uploadUrl) throw new Error("Microsoft upload session was not created.");

  let offset = 0;
  let uploadedItem: any = null;

  while (offset < fileBytes.byteLength) {
    const nextOffset = Math.min(offset + uploadChunkSize, fileBytes.byteLength);
    const chunk = fileBytes.slice(offset, nextOffset);
    const uploadResponse = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${offset}-${nextOffset - 1}/${fileBytes.byteLength}`,
      },
      body: chunk,
    });

    if (uploadResponse.status === 202) {
      offset = nextOffset;
      continue;
    }

    if (uploadResponse.ok) {
      uploadedItem = await uploadResponse.json();
      break;
    }

    throw new Error(await getGraphErrorMessage(uploadResponse));
  }

  if (!uploadedItem) throw new Error("Microsoft upload did not return a Drive item.");
  return uploadedItem;
};

const getExistingDriveItem = async (token: string, driveId: string, driveItemId: string) => {
  try {
    const response = await graphFetch(
      token,
      `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(driveItemId)}`,
    );
    return await response.json();
  } catch {
    return null;
  }
};

const escapeXml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const createCoreProperties = (title: string) => {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>SUCCMS Learn</dc:creator>
  <cp:lastModifiedBy>SUCCMS Learn</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
};

const createAppProperties = (appName: string) => {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>${appName}</Application>
</Properties>`;
};

const zipFiles = async (files: Record<string, string>) => {
  const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1?target=deno");
  const zip = new JSZip();
  Object.entries(files).forEach(([path, content]) => zip.file(path, content));
  return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
};

const createBlankDocx = async (title: string) => {
  return await zipFiles({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": createCoreProperties(title),
    "docProps/app.xml": createAppProperties("Microsoft Word"),
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p/>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  });
};

const createBlankXlsx = async (title: string) => {
  return await zipFiles({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": createCoreProperties(title),
    "docProps/app.xml": createAppProperties("Microsoft Excel"),
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData/>
</worksheet>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
  });
};

const createBlankPptx = async (title: string) => {
  return await zipFiles({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": createCoreProperties(title),
    "docProps/app.xml": createAppProperties("Microsoft PowerPoint"),
    "ppt/presentation.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    "ppt/_rels/presentation.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`,
    "ppt/slides/slide1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`,
    "ppt/slides/_rels/slide1.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,
    "ppt/slideLayouts/slideLayout1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`,
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,
    "ppt/slideMasters/slideMaster1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle/>
    <p:bodyStyle/>
    <p:otherStyle/>
  </p:txStyles>
</p:sldMaster>`,
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,
    "ppt/theme/theme1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
      <a:accent2><a:srgbClr val="C0504D"/></a:accent2>
      <a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
      <a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
      <a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="0000FF"/></a:hlink>
      <a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`,
  });
};

const createBlankOfficeFile = async (kind: string, title: string) => {
  if (kind === "word") return await createBlankDocx(title);
  if (kind === "excel") return await createBlankXlsx(title);
  if (kind === "powerpoint") return await createBlankPptx(title);
  throw new Error("This Microsoft Office file type is not supported.");
};

const createEditLink = async (token: string, driveId: string, driveItemId: string, linkScope: string) => {
  const linkResponse = await graphFetch(
    token,
    `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(driveItemId)}/createLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "edit", scope: linkScope }),
    },
  );
  const linkPayload = await linkResponse.json();
  return linkPayload?.link?.webUrl as string | undefined;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const driveId = Deno.env.get("MICROSOFT_DRIVE_ID");
    const baseFolder = Deno.env.get("MICROSOFT_DRIVE_FOLDER_PATH") || "SUCCMS";
    const linkScope = Deno.env.get("MICROSOFT_LINK_SCOPE") || "organization";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !driveId) {
      throw new Error("Supabase or Microsoft Drive environment is not configured.");
    }

    const body = await req.json();

    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const token = await getGraphToken();

    if (body.action === "create") {
      const courseId = body.courseId;
      const parentId = body.parentId || null;
      const kind = body.kind;
      const extension = officeKindExtensions[kind];
      if (!courseId) throw new Error("courseId is required.");
      if (!extension) throw new Error("This Microsoft Office file type is not supported.");

      if (parentId) {
        const { data: parentFolder, error: parentError } = await serviceClient
          .from("course_materials")
          .select("id")
          .eq("id", parentId)
          .eq("course_id", courseId)
          .eq("file_type", "folder")
          .single();

        if (parentError || !parentFolder) throw new Error("Target folder was not found.");
      }

      const requestedTitle = typeof body.title === "string" ? body.title.trim() : "";
      const title = requestedTitle || defaultOfficeTitles[kind];
      const normalizedTitle = title.toLowerCase().endsWith(`.${extension}`) ? title : `${title}.${extension}`;
      const fileBytes = await createBlankOfficeFile(kind, normalizedTitle);
      const driveFileName = `${crypto.randomUUID()}-${getSafeDriveFileName(normalizedTitle)}`;
      const drivePath = `${baseFolder}/${courseId}/${driveFileName}`;
      const driveItem = await uploadSmallFile(token, driveId, drivePath, fileBytes, getContentType(extension));
      const editUrl = await createEditLink(token, driveId, driveItem.id, linkScope) || driveItem.webUrl;

      const { data: material, error: insertError } = await serviceClient
        .from("course_materials")
        .insert({
          course_id: courseId,
          parent_id: parentId,
          title: normalizedTitle,
          file_path: null,
          file_url: driveItem.webUrl,
          file_type: getContentType(extension),
          size: fileBytes.byteLength,
          created_by: userData.user.id,
          uploaded_by: userData.user.id,
          ms_drive_id: driveId,
          ms_drive_item_id: driveItem.id,
          ms_web_url: driveItem.webUrl,
          ms_edit_url: editUrl,
          ms_last_synced_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      return jsonResponse({
        editUrl,
        webUrl: driveItem.webUrl,
        material,
      });
    }

    const materialId = body.materialId;
    if (!materialId) throw new Error("materialId is required.");

    const { data: material, error: materialError } = await serviceClient
      .from("course_materials")
      .select("*")
      .eq("id", materialId)
      .single();

    if (materialError || !material) throw new Error("File was not found.");
    if (material.file_type === "folder") throw new Error("Folders cannot be opened in Microsoft Office.");

    const extension = getExtension(material.title || material.file_path || material.file_url || "");
    if (!officeExtensions.has(extension)) {
      throw new Error("Only Word, Excel, and PowerPoint files can be edited with Microsoft Office.");
    }

    let driveItemDriveId = material.ms_drive_id || driveId;
    let driveItem = material.ms_drive_item_id
      ? await getExistingDriveItem(token, driveItemDriveId, material.ms_drive_item_id)
      : null;

    if (!driveItem) {
      driveItemDriveId = driveId;
      const fileBytes = await loadFileBytes(serviceClient, material);
      const fileName = `${material.id}-${getSafeDriveFileName(material.title || `document.${extension}`)}`;
      const drivePath = `${baseFolder}/${material.course_id}/${fileName}`;

      driveItem = fileBytes.byteLength <= 4 * 1024 * 1024
        ? await uploadSmallFile(token, driveId, drivePath, fileBytes, getContentType(extension))
        : await uploadLargeFile(token, driveId, drivePath, fileBytes);
    }

    const editUrl = await createEditLink(token, driveItemDriveId, driveItem.id, linkScope) || driveItem.webUrl;

    const materialUpdate = {
      ms_drive_id: driveItemDriveId,
      ms_drive_item_id: driveItem.id,
      ms_web_url: driveItem.webUrl,
      ms_edit_url: editUrl,
      ms_last_synced_at: new Date().toISOString(),
    };

    const { data: updatedMaterial, error: updateError } = await serviceClient
      .from("course_materials")
      .update(materialUpdate)
      .eq("id", material.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return jsonResponse({
      editUrl,
      webUrl: driveItem.webUrl,
      material: updatedMaterial || { ...material, ...materialUpdate },
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
