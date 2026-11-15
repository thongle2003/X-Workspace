import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// A random, single-purpose admin password is held outside Git. Only this
// salted verifier is deployed; PUBLIC_DEMO and the visitor gate are unchanged.
const salt=Buffer.from('ca88cf194006ee513f6c381ca2ae91db1b1fcccf65fa7c1e','hex');
const expected=Buffer.from('54230ed0d1bd35a39d0dcb04e885393f0880d28b9ee39c7d45569c0fcddc5cbc','hex');
const derive=promisify(scrypt);

export async function verifyDeployedAdminPassword(value) {
  if(typeof value!=='string'||value.length>256)return false;
  const actual=await derive(value,salt,expected.length,{N:1<<15,r:8,p:1,maxmem:64*1024*1024});
  return timingSafeEqual(actual,expected);
}
