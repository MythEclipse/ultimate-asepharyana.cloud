import { fileTypeFromBuffer } from 'file-type';
const ryzenCDN = async (
  inp:
    | Buffer
    | { buffer: Buffer; originalname?: string }
    | Array<Buffer | { buffer: Buffer; originalname?: string }>,
) => {
  try {
    const form = new FormData();
    const files = Array.isArray(inp) ? inp : [inp];

    for (const file of files) {
      const buffer = Buffer.isBuffer(file) ? file : file.buffer;
      if (!Buffer.isBuffer(buffer)) throw new Error('Invalid buffer format');

      const type = await fileTypeFromBuffer(buffer as Uint8Array);
      if (!type) throw new Error('Unsupported file type');

      const originalName =
        'originalname' in file
          ? (file.originalname || 'file').split('.').shift()
          : 'file';

      // Convert Buffer to Uint8Array then to ArrayBuffer for native FormData
      form.append(
        'file',
        new Blob([new Uint8Array(buffer)], { type: type.mime }),
        `${originalName}.${type.ext}`,
      );
    }

    const res = await fetch('https://api.ryzumi.vip/api/uploader/ryzencdn', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        Connection: 'keep-alive',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      body: form,
    });

    type RyzenCDNResponse = {
      success: boolean;
      message?: string;
      url?: string;
      [key: string]: string | boolean | number | object | null | undefined;
    };
    const json = (await res.json()) as RyzenCDNResponse;
    if (!json.success) throw new Error(json.message || 'Upload failed');

    return Array.isArray(inp)
      ? (json as unknown as RyzenCDNResponse[]).map(
          (f: RyzenCDNResponse) => f.url,
        )
      : json.url;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`RyzenCDN Error: ${error.message}`);
    } else {
      throw new Error('RyzenCDN Error: Unknown error');
    }
  }
};

export { ryzenCDN };
