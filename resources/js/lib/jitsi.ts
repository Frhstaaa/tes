export interface JitsiMeetExternalAPIInstance {
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  dispose: () => void;
}

export interface JitsiMeetExternalAPIConstructor {
  new (
    domain: string,
    options: {
      roomName: string;
      jwt?: string;
      parentNode: HTMLElement;
      width?: string | number;
      height?: string | number;
      userInfo?: { displayName?: string };
      configOverwrite?: Record<string, unknown>;
      interfaceConfigOverwrite?: Record<string, unknown>;
    }
  ): JitsiMeetExternalAPIInstance;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor;
  }
}

const loadedScripts = new Map<string, Promise<JitsiMeetExternalAPIConstructor>>();

export function loadJitsiExternalApi(domain: string): Promise<JitsiMeetExternalAPIConstructor> {
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI);
  }

  const existing = loadedScripts.get(domain);
  if (existing) {
    return existing;
  }

  const promise = new Promise<JitsiMeetExternalAPIConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => {
      if (window.JitsiMeetExternalAPI) {
        resolve(window.JitsiMeetExternalAPI);
      } else {
        reject(new Error('Layanan ruang meeting belum siap. Silakan muat ulang halaman.'));
      }
    };
    script.onerror = () => {
      loadedScripts.delete(domain);
      reject(new Error('Tidak dapat terhubung ke server ruang meeting.'));
    };
    document.head.appendChild(script);
  });

  loadedScripts.set(domain, promise);
  return promise;
}
