export type RecordData = Record<string, any>;
let csrfToken = '';
export async function getApi(path: string): Promise<any> {
  const response = await fetch(`/api/${path}`, {cache: 'no-store'});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || result.error || `Request failed (${response.status})`);
  if (result.csrfToken) csrfToken = result.csrfToken;
  return result;
}
export async function action(name: string, data: RecordData = {}): Promise<any> {
  const response = await fetch(`/api/actions/${name}`, {method:'POST', headers:{'Content-Type':'application/json','X-Academy-CSRF':csrfToken}, body:JSON.stringify(data)});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || result.error || `Request failed (${response.status})`);
  return result;
}
export const requestId = () => crypto.randomUUID();
export const lessonId = (value: any) => typeof value === 'string' ? value : value?.id || value?.lessonId || '';
export const lessonNumber = (value: any) => Number(lessonId(value).replace(/\D/g, ''));
export const formatLesson = (value: any) => `L${String(lessonNumber(value)).padStart(3,'0')}`;
export const navigate = (path: string) => {window.location.hash = path;};
export const pretty = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
