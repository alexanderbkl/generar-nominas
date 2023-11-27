// "this" refer to the instance of PDFSecurity class written for pdf-lib 
// (Excluded from the gist for clarity)
import CryptoJS from 'crypto-js';

const wordArrayToBuffer = (wordArray: WordArray): Uint8Array => {
  const byteArray = [];
  for (let i = 0; i < wordArray.sigBytes; i++) {
    byteArray.push(
      (wordArray.words[Math.floor(i / 4)] >> (8 * (3 - (i % 4)))) & 0xff,
    );
  }

  return Uint8Array.from(byteArray);
};

const processPasswordR2R3R4 = (password = '') => {
  const out = Buffer.alloc(32);
  const length = password.length;
  let index = 0;
  while (index < length && index < 32) {
    const code = password.charCodeAt(index);
    if (code > 0xff) {
      throw new Error('Password contains one or more invalid characters.');
    }
    out[index] = code;
    index++;
  }
  while (index < 32) {
    out[index] = PASSWORD_PADDING[index - length]; // PASSWORD_PADDING is the padding described in Algorithm 2 - Step (a)
    index++;
  }
  return CryptoJS.lib.WordArray.create((out as unknown) as number[]);
};

const getUserPasswordR2 = (encryptionKey: CryptoJS.lib.WordArray) =>
  CryptoJS.RC4.encrypt(processPasswordR2R3R4(), encryptionKey).ciphertext;

const getUserPasswordR3R4 = (
  documentId: Uint8Array,
  encryptionKey: WordArray,
) => {
  const key = encryptionKey.clone();
  let cipher = CryptoJS.MD5(
    processPasswordR2R3R4().concat(
      CryptoJS.lib.WordArray.create((documentId as unknown) as number[]),
    ),
  );
  for (let i = 0; i < 20; i++) {
    const xorRound = Math.ceil(key.sigBytes / 4);
    for (let j = 0; j < xorRound; j++) {
      key.words[j] =
        encryptionKey.words[j] ^ (i | (i << 8) | (i << 16) | (i << 24));
    }
    cipher = CryptoJS.RC4.encrypt(cipher, key).ciphertext;
  }
  return cipher.concat(
    CryptoJS.lib.WordArray.create((null as unknown) as undefined, 16),
  );
};

let userPasswordEntry;
if (r === 2) {
  // Security handler equal to 2, Algorithm 4
  userPasswordEntry = getUserPasswordR2(this.encryptionKey); // Encryption key from Algorithm 2
} else {
  // Security handler 3 and above, Algorithm 5
  userPasswordEntry = getUserPasswordR3R4(
    this.document._id, // ID entry of Encryption dictionary
    this.encryptionKey, // Encryption key from Algorithm 2
  );
}

// Saved as Buffer for PDFWriter - U entry
encDict.U = wordArrayToBuffer(userPasswordEntry);


const processPasswordR2R3R4 = (password = '') => {
  const out = Buffer.alloc(32);
  const length = password.length;
  let index = 0;
  while (index < length && index < 32) {
    const code = password.charCodeAt(index);
    if (code > 0xff) {
      throw new Error('Password contains one or more invalid characters.');
    }
    out[index] = code;
    index++;
  }
  while (index < 32) {
    out[index] = PASSWORD_PADDING[index - length]; // PASSWORD_PADDING is the padding described in Algorithm 2 - Step (a)
    index++;
  }
  return CryptoJS.lib.WordArray.create((out as unknown) as number[]);
};

const getOwnerPasswordR2R3R4 = (
  r: EncDictR,
  keyBits: EncKeyBits,
  paddedUserPassword: WordArray,
  paddedOwnerPassword: WordArray,
): CryptoJS.lib.WordArray => {
  let digest = paddedOwnerPassword;
  let round = r >= 3 ? 51 : 1;
  for (let i = 0; i < round; i++) {
    digest = CryptoJS.MD5(digest);
  }

  const key = digest.clone();
  key.sigBytes = keyBits / 8;
  let cipher = paddedUserPassword;
  round = r >= 3 ? 20 : 1;
  for (let i = 0; i < round; i++) {
    const xorRound = Math.ceil(key.sigBytes / 4);
    for (let j = 0; j < xorRound; j++) {
      key.words[j] = digest.words[j] ^ (i | (i << 8) | (i << 16) | (i << 24));
    }
    cipher = CryptoJS.RC4.encrypt(cipher, key).ciphertext;
  }
  return cipher;
};

const paddedUserPassword: WordArray = processPasswordR2R3R4(
  options.userPassword, // the actual userPassword
);

const paddedOwnerPassword: WordArray = options.ownerPassword // the actual ownerPassword
  ? processPasswordR2R3R4(options.ownerPassword)
  : paddedUserPassword;

// Algorithm 3
const ownerPasswordEntry: WordArray = getOwnerPasswordR2R3R4(
    r,
    this.keyBits, // Length entry in the Crypt Filter
    paddedUserPassword,
    paddedOwnerPassword,
  );

// Saved as Buffer for PDFWriter - O entry
encDict.O = wordArrayToBuffer(ownerPasswordEntry);