import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Search,
} from "lucide-react";

const administrativeOffices = [
  {
    name: "Academic Affairs, Admission & Registration",
    abbr: "AARO",
    phone: "07-5586605",
    email: "reg@sc.edu.my",
    purpose: "Admissions, student documents, exams, and registration matters",
  },
  {
    name: "Student Recruitment Office",
    abbr: "SRO",
    phone: "+607-554 3466",
    email: "marketing@sc.edu.my",
    purpose: "Course & admission counseling, applications, scholarships",
  },
  {
    name: "Student Affairs Office",
    abbr: "SAO",
    phone: "07-5586605",
    email: "sao@sc.edu.my",
    purpose: "Student affairs, scholarships, internships, hostel, and counseling",
  },
  {
    name: "International Student Office",
    abbr: "ISO",
    phone: "+607-558 6605 Ext. 226",
    email: "ISO@sc.edu.my",
    purpose: "International student inquiries, visa applications and renewals",
  },
  {
    name: "Human Resource Office",
    abbr: "HRO",
    phone: "07-5586605 Ext. 221 / 202",
    email: "HRO@sc.edu.my",
    purpose: "Recruitment, job applications, and personnel matters",
  },
  {
    name: "Account & Finance Office",
    abbr: "Finance",
    phone: "+607-558 6605 Ext. 123",
    email: "accfin@sc.edu.my",
    purpose: "Student finance, receipts, payments, and other financial matters",
  },
  {
    name: "Planning, Development & Quality Assurance",
    abbr: "PDAQ",
    phone: "07-5586605",
    email: "secretarial@sc.edu.my",
    purpose: "Planning, development, accreditation & quality assurance",
  },
  {
    name: "Infrastructure, Safety & Security",
    abbr: "IPSSO",
    phone: "07-5586605",
    email: "secretarial@sc.edu.my",
    purpose: "Infrastructure planning, safety and security matters",
  },
  {
    name: "Asset Management & General Affairs",
    abbr: "AGO",
    phone: "07-5586605",
    email: "secretarial@sc.edu.my",
    purpose: "Asset management, facilities, cleaning, security, venue rental",
  },
  {
    name: "Computer Centre Office",
    abbr: "IT",
    phone: "07-5586605",
    email: "secretarial@sc.edu.my",
    purpose: "Accounts, network, website, hardware/server support, IT equipment",
  },
  {
    name: "Public Relations & Corporate Comms",
    abbr: "PRCC",
    phone: "+607-554 3466 / 07-5586605",
    email: "secretarial@sc.edu.my",
    purpose: "Public relations and corporate communications",
  },
  {
    name: "Life-long Learning / Corporate Training",
    abbr: "Life-long",
    phone: "+607-554 3466 / 07-5586605",
    email: "scem@sc.edu.my",
    purpose: "Life-long learning and corporate training",
  },
];



const faqs = [
  {
    question: "How do I join a course?",
    answer: "Open My Courses, choose Join Course, then enter the enrollment key provided by your lecturer.",
  },
  {
    question: "Where can I check assignment deadlines?",
    answer: "Use the Assignments page to see upcoming work, submitted tasks, and grading status in one place.",
  },
  {
    question: "How do I change my password?",
    answer: "Go to Settings, open Security, then use the Change Password form.",
  },
  {
    question: "Why are my settings not saving?",
    answer: "Settings auto-save after a short delay. If the save status shows an error, check your connection and try changing the setting again.",
  },
];

export function HelpSupportPage() {
  const { user, profile } = useAuth();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <LifeBuoy className="h-8 w-8 text-primary" />
            Help & Support
          </h1>
          <p className="mt-1 text-muted-foreground">Find answers, check common workflows, or send a support request.</p>
        </div>

      </div>



      <div className="flex flex-col gap-6">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-5 w-5 text-primary" />
                Common Questions
              </CardTitle>
              <CardDescription>Quick answers for frequent student and lecturer issues.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Student Services
              </CardTitle>
              <CardDescription>Use these contacts when the issue is outside the platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Sheet>
                <SheetTrigger asChild>
                  <div className="rounded-xl border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <Mail className="mb-3 h-5 w-5 text-blue-600" />
                    <p className="font-medium">Administrative Offices</p>
                    <p className="mt-1 text-sm text-muted-foreground">Directory for all campus administration and support</p>
                  </div>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 !overflow-hidden">
                  <SheetHeader className="px-6 pt-6 pb-5 border-b shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="rounded-xl bg-blue-100 dark:bg-blue-900/40 p-2.5">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <SheetTitle className="text-lg">Administrative Offices</SheetTitle>
                        <SheetDescription className="text-xs mt-0.5">Campus admin & support contacts</SheetDescription>
                      </div>
                    </div>
                    <div className="relative mt-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search offices..."
                        className="pl-9 h-10 text-sm rounded-lg"
                        onChange={(e) => {
                          const q = e.target.value.toLowerCase();
                          document.querySelectorAll('[data-office-card]').forEach((el) => {
                            const name = el.getAttribute('data-office-name') || '';
                            (el as HTMLElement).style.display = name.includes(q) ? '' : 'none';
                          });
                        }}
                      />
                    </div>
                  </SheetHeader>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div className="px-6 py-5 space-y-4">
                      {administrativeOffices.map((office) => (
                        <div
                          key={office.abbr}
                          data-office-card
                          data-office-name={`${office.name.toLowerCase()} ${office.abbr.toLowerCase()}`}
                          className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-blue-300/50 dark:hover:border-blue-700/50"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <h3 className="font-semibold text-sm leading-snug">{office.name}</h3>
                            <Badge variant="outline" className="shrink-0 text-[10px] font-bold tracking-wide bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                              {office.abbr}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                            {office.purpose}
                          </p>

                          <div className="flex flex-col gap-2.5 pt-3.5 border-t border-dashed border-muted-foreground/20">
                            <div className="flex items-center gap-2.5 text-xs">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium">{office.phone}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <a href={`mailto:${office.email}`} className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                                {office.email}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="rounded-xl border p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-emerald-600" />
                <p className="font-medium">IT Helpdesk</p>
                <p className="mt-1 text-sm text-muted-foreground">Login, device, and access problems</p>
              </div>
              <div className="rounded-xl border p-4">
                <AlertCircle className="mb-3 h-5 w-5 text-orange-600" />
                <p className="font-medium">Urgent Issues</p>
                <p className="mt-1 text-sm text-muted-foreground">Report critical blockers during submissions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
