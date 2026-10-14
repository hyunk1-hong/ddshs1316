export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      `/api${path}`,
      body === undefined
        ? undefined
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    );
  } catch {
    throw new Error('서버에 연결할 수 없어요. 연결 상태를 확인하고 다시 시도하세요.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '요청을 처리하지 못했어요.');
  return data;
}
