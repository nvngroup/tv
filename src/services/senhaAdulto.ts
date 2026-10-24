const ITERACOES = 310_000;
const TAMANHO_SALT = 16;
const TAMANHO_HASH = 32;

function paraBase64(bytes: Uint8Array): string {
  let binario = '';
  bytes.forEach((byte) => { binario += String.fromCharCode(byte); });
  return btoa(binario);
}

function deBase64(valor: string): Uint8Array<ArrayBuffer> {
  const binario = atob(valor);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function derivar(senha: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  if (!globalThis.crypto?.subtle) throw new Error('Este navegador não oferece criptografia segura para criar a senha.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERACOES }, material, TAMANHO_HASH * 8);
  return new Uint8Array(bits);
}

export async function criarHashSenhaAdulto(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(TAMANHO_SALT)));
  const hash = await derivar(senha, salt);
  return `pbkdf2-sha256$${ITERACOES}$${paraBase64(salt)}$${paraBase64(hash)}`;
}

export async function verificarSenhaAdulto(senha: string, registro: string): Promise<boolean> {
  const [algoritmo, iteracoes, saltCodificado, hashCodificado, ...extras] = registro.split('$');
  if (!saltCodificado || !hashCodificado || extras.length || algoritmo !== 'pbkdf2-sha256' || Number(iteracoes) !== ITERACOES) return false;

  try {
    const salt = deBase64(saltCodificado);
    const esperado = deBase64(hashCodificado);
    if (salt.length !== TAMANHO_SALT || esperado.length !== TAMANHO_HASH) return false;
    const calculado = await derivar(senha, salt);
    let diferenca = 0;
    for (let i = 0; i < esperado.length; i += 1) diferenca |= esperado[i] ^ calculado[i];
    return diferenca === 0;
  } catch {
    return false;
  }
}
