import { building, dev } from '$app/environment';
import { env as privateENV } from '$env/dynamic/private';
import PocketBase from 'pocketbase';
import type { TypedPocketBase } from './types';

function getPocketBaseURL() {
  return dev ? 'http://127.0.0.1:8090' : 'http://0.0.0.0:8090';
}

export function createPocketBaseClient(): TypedPocketBase {
  const pb: TypedPocketBase = new PocketBase(getPocketBaseURL());
  pb.autoCancellation(false);
  return pb;
}

const serverPB = createPocketBaseClient();
if (!building) {
  try {
    await serverPB.admins.authWithPassword(privateENV.POCKETBASE_INTERNAL_ADMIN_EMAIL, privateENV.POCKETBASE_INTERNAL_ADMIN_PASSWORD);
  } catch (e) {
    console.log('Failed to authenticate with PocketBase (thats not good)');
  }
}
export { getPocketBaseURL, serverPB };

// export type HandledPBError = {
//   failReturn: (errorData: object) => ActionFailure<{ message: string } & unknown>;
// } & HttpError;

// export function handlePBError(pbError: ClientResponseError, from: string): never {
//   throw {
//     ...error(
//       pbError.status,
//       `${pbError.response?.message}\n${Object.values(pbError.response.data)
//         .map((e) => (e as { message: string }).message + '\n')
//         .toString()}(- ${from})`
//     ),
//     failReturn: (errorData: object) =>
//       fail(pbError.status, {
//         ...errorData,
//         message: `${pbError.response?.message}\n${Object.values(pbError.response.data)
//           .map((e) => (e as { message: string }).message + '\n')
//           .toString()}(- ${from})`
//       })
//   } as HandledPBError;
// }
