import api from '@/lib/api';

export async function downloadReportPdf(
  path: string,
  filename: string,
  params: Record<string, string | undefined>,
): Promise<void> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const qs = searchParams.toString();
  const response = await api.get(`${path}${qs ? `?${qs}` : ''}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
