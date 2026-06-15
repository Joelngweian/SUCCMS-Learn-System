export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmRequest = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

type ConfirmListener = (request: ConfirmRequest | null) => void;

let activeRequest: ConfirmRequest | null = null;
const listeners = new Set<ConfirmListener>();

const emit = () => {
  listeners.forEach((listener) => listener(activeRequest));
};

export const confirmAction = (options: ConfirmOptions) =>
  new Promise<boolean>((resolve) => {
    if (activeRequest) activeRequest.resolve(false);

    activeRequest = { ...options, resolve };
    emit();
  });

export const subscribeToConfirm = (listener: ConfirmListener) => {
  listeners.add(listener);
  listener(activeRequest);

  return () => {
    listeners.delete(listener);
  };
};

export const resolveConfirm = (confirmed: boolean) => {
  const request = activeRequest;
  activeRequest = null;
  emit();
  request?.resolve(confirmed);
};
