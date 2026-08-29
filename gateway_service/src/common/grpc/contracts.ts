import { loadFileDescriptorSetFromBuffer } from '@grpc/proto-loader';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const grpcPackageDefinition = loadFileDescriptorSetFromBuffer(
  readFileSync(join(__dirname, '../../generated/contracts.binpb')),
  {
    arrays: true,
    defaults: true,
    longs: String,
  },
);
