import { Readable } from 'node:stream';

export type StoredObject = {
  key: string;
  url: string;
  mime?: string;
  size?: number;
};

export interface StorageProvider {
  putObject(
    key: string,
    body: Buffer | Readable,
    opts: { mime: string; acl?: 'private' | 'public-read' },
  ): Promise<StoredObject>;
  getSignedUrl(key: string, expiresSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
