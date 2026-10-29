import { Platform } from "react-native";
import { apiOrigin } from "../../constants/config";

const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Readonly<Record<string, string>>;

  constructor(status: number, code: string, message: string, fields?: Readonly<Record<string, string>>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
  }
}

export type RequestOptions = {
  method?: string;
  body?: unknown;
  sessionToken?: string | null;
  /** For binary uploads (e.g. cargo images). Takes precedence over `body`/JSON encoding when set. */
  rawBody?: { data: ArrayBuffer | Blob; contentType: string };
};

type RawResponse = {
  status: number;
  body: unknown;
  setCookie: string | null;
};

export type ApiResult<T> = {
  data: T;
  sessionToken: string | null;
};

function networkError(): ApiError {
  return new ApiError(0, "network_error", "Không kết nối được máy chủ. Hãy thử lại.");
}

function parseJson(text: string): unknown {
  if (text.trim().length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function sessionFromSetCookie(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/coldi_session=([^;\s,]+)/i);
  const value = match?.[1];
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readSetCookie(xhr: XMLHttpRequest): string | null {
  return sessionFromSetCookie(xhr.getResponseHeader("set-cookie")) ?? sessionFromSetCookie(xhr.getAllResponseHeaders());
}

function readError(status: number, body: unknown): ApiError {
  const error = typeof body === "object" && body !== null && "error" in body ? (body as { error?: unknown }).error : undefined;
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const fieldsRaw = record.fields;
  let fields: Record<string, string> | undefined;
  if (typeof fieldsRaw === "object" && fieldsRaw !== null) {
    fields = {};
    for (const [key, value] of Object.entries(fieldsRaw)) {
      if (typeof value === "string") fields[key] = value;
    }
  }
  return new ApiError(
    status,
    typeof record.code === "string" ? record.code : "request_failed",
    typeof record.message === "string" ? record.message : "Yêu cầu không thành công.",
    fields,
  );
}

function nativeRequest(path: string, options: RequestOptions): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open((options.method ?? "GET").toUpperCase(), `${apiOrigin}${path}`);
    xhr.timeout = TIMEOUT_MS;
    xhr.setRequestHeader("Accept", "application/json");
    if (options.rawBody) xhr.setRequestHeader("Content-Type", options.rawBody.contentType);
    else if (options.body !== undefined) xhr.setRequestHeader("Content-Type", "application/json");
    if (options.sessionToken) xhr.setRequestHeader("Cookie", `coldi_session=${options.sessionToken}`);
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        body: parseJson(xhr.responseText),
        setCookie: readSetCookie(xhr),
      });
    };
    xhr.onerror = () => reject(networkError());
    xhr.ontimeout = () => reject(networkError());
    if (options.rawBody) xhr.send(options.rawBody.data);
    else xhr.send(options.body === undefined ? null : JSON.stringify(options.body));
  });
}

async function webRequest(path: string, options: RequestOptions): Promise<RawResponse> {
  try {
    const response = await fetch(`${apiOrigin}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.rawBody
        ? { Accept: "application/json", "Content-Type": options.rawBody.contentType }
        : {
            Accept: "application/json",
            ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
          },
      body: options.rawBody ? options.rawBody.data : options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    return { status: response.status, body: parseJson(await response.text()), setCookie: null };
  } catch {
    throw networkError();
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const raw = Platform.OS === "web" ? await webRequest(path, options) : await nativeRequest(path, options);
  if (raw.status < 200 || raw.status >= 300) throw readError(raw.status, raw.body);
  return { data: raw.body as T, sessionToken: raw.setCookie };
}
