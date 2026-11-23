import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const S = 256, C = 64, M = 256, L = 1_000_000, X = 65_536;
const T = { U: 2, O: 3, D: 4, B: 5, M: 6, C: 7, R: 8, P: 9, S: 10, X: 11 };
const N = new TextEncoder();
const OP = new Map([
  [0x00, [0, 0]], [0x01, [1, 1]], [0x02, [2, 4]], [0x03, [3, 0]], [0x04, [4, 0]],
  [0x05, [5, 0]], [0x06, [6, 0]], [0x07, [7, 0]], [0x10, [16, 0]], [0x11, [17, 0]],
  [0x12, [18, 0]], [0x13, [19, 0]], [0x14, [20, 0]], [0x15, [21, 0]], [0x16, [22, 0]],
  [0x17, [23, 0]], [0x18, [24, 0]], [0x19, [25, 0]], [0x1a, [26, 0]], [0x1b, [27, 0]],
  [0x1c, [28, 0]], [0x1d, [29, 0]], [0x1e, [30, 0]], [0x20, [31, 0]], [0x21, [32, 0]],
  [0x22, [33, 0]], [0x30, [34, 2]], [0x31, [35, 2]], [0x32, [36, 2]], [0x33, [37, 2]],
  [0x34, [38, 0]], [0x40, [39, 0]], [0x41, [40, 0]], [0x50, [41, 0]], [0x51, [42, 0]],
  [0x52, [43, 0]], [0x53, [44, 0]],
]);
// 0=HALT 1=PUSH8 2=PUSH32 3=POP 4=DUP 5=SWAP 6=OVER 7=ROT
// 16=ADD 17=SUB 18=MUL 19=DIV 20=MOD 21=DIVU 22=MODU 23=NEG 24=AND 25=OR 26=XOR 27=NOT
// 28=SHL 29=SHR 30=SHRU 31=EQ 32=LT 33=LTU
// 34=JMP 35=JZ 36=JNZ 37=CALL 38=RET
// 39=LOAD 40=STORE 41=PRINT 42=PUTC 43=IN 44=EXIT

function run(p, i) {
  const n = p.length;
  const D = new Int32Array(S);
  let s = 0;
  const R = new Int32Array(C);
  let r = 0;
  const Mm = new Int32Array(M);
  const o = new Uint8Array(X);
  let ol = 0, ip = 0, pc = 0, st = 0;
  const done = (e, t) => ({ out: o.slice(0, ol), exit: e, trap: t });
  const trap = (c) => done(c, c);
  for (;;) {
    if (st === L) return trap(T.S);
    if (pc < 0 || pc >= n) return trap(T.P);
    const op = OP.get(p[pc]);
    if (!op) return trap(T.B);
    const [cd, im] = op;
    if (pc + im >= n) return trap(T.P);
    st++;
    const nx = pc + 1 + im;
    let pop = 0, push = 0;
    if (cd === 3 || cd === 4 || cd === 23 || cd === 27 || cd === 44 || cd === 41 || cd === 42 || cd === 39) pop = 1;
    else if (cd >= 16 && cd <= 33) pop = 2;
    else if (cd === 5 || cd === 6) pop = 2;
    else if (cd === 7) pop = 3;
    else if (cd === 40) pop = 2;
    else if (cd === 35 || cd === 36) pop = 1;
    if (cd === 4) push = 2;
    else if (cd === 5) push = 2;
    else if (cd === 6 || cd === 7) push = 3;
    else if (cd >= 1 && cd <= 2 && cd !== 3) push = 1;
    else if (cd >= 16 && cd <= 33) push = 1;
    else if (cd === 23 || cd === 27 || cd === 43) push = 1;
    else if (cd === 39) push = 1;
    if (s < pop) return trap(T.U);
    if (s - pop + push > S) return trap(T.O);
    pc = nx;
    if (cd === 0) return done(0, null);
    if (cd === 1) { D[s++] = (p[nx - 1] << 24) >> 24; continue; }
    if (cd === 2) { D[s++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); continue; }
    if (cd === 3) { s--; continue; }
    if (cd === 4) { D[s] = D[s - 1]; s++; continue; }
    if (cd === 5) { const t = D[s - 1]; D[s - 1] = D[s - 2]; D[s - 2] = t; continue; }
    if (cd === 6) { D[s] = D[s - 2]; s++; continue; }
    if (cd === 7) { const a = D[s - 3]; D[s - 3] = D[s - 2]; D[s - 2] = D[s - 1]; D[s - 1] = a; continue; }
    if (cd === 23) { D[s - 1] = -D[s - 1] | 0; continue; }
    if (cd === 27) { D[s - 1] = ~D[s - 1]; continue; }
    if (cd === 43) { D[s++] = ip < i.length ? i[ip++] : -1; continue; }
    if (cd === 41) {
      const b = N.encode(String(D[s - 1]));
      if (ol + b.length > X) return trap(T.X);
      s--; o.set(b, ol); ol += b.length; continue;
    }
    if (cd === 42) {
      if (ol + 1 > X) return trap(T.X);
      o[ol++] = D[--s] & 255; continue;
    }
    if (cd === 44) return done(D[--s] & 255, null);
    if (cd === 39) {
      const a = D[s - 1];
      if (a < 0 || a >= M) return trap(T.M);
      D[s - 1] = Mm[a]; continue;
    }
    if (cd === 40) {
      const a = D[s - 1], v = D[s - 2];
      if (a < 0 || a >= M) return trap(T.M);
      s -= 2; Mm[a] = v; continue;
    }
    if (cd === 37) {
      if (r === C) return trap(T.C);
      R[r++] = nx;
      pc = p[nx - 2] | (p[nx - 1] << 8); continue;
    }
    if (cd === 38) {
      if (r === 0) return trap(T.R);
      pc = R[--r]; continue;
    }
    if (cd === 34 || cd === 35 || cd === 36) {
      const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
      let tk = true;
      if (cd !== 34) { const v = D[--s]; tk = cd === 35 ? v === 0 : v !== 0; }
      if (tk) pc = nx + rel; continue;
    }
    const b = D[s - 1], a = D[s - 2];
    let res;
    if (cd === 16) res = (a + b) | 0;
    else if (cd === 17) res = (a - b) | 0;
    else if (cd === 18) res = Math.imul(a, b);
    else if (cd === 19) { if (b === 0) return trap(T.D); res = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
    else if (cd === 20) { if (b === 0) return trap(T.D); res = b === -1 ? 0 : a % b | 0; }
    else if (cd === 21) { if (b === 0) return trap(T.D); res = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
    else if (cd === 22) { if (b === 0) return trap(T.D); res = (a >>> 0) % (b >>> 0) | 0; }
    else if (cd === 24) res = a & b;
    else if (cd === 25) res = a | b;
    else if (cd === 26) res = a ^ b;
    else if (cd === 28) res = a << (b & 31);
    else if (cd === 29) res = a >> (b & 31);
    else if (cd === 30) res = (a >>> (b & 31)) | 0;
    else if (cd === 31) res = a === b ? 1 : 0;
    else if (cd === 32) res = a < b ? 1 : 0;
    else if (cd === 33) res = (a >>> 0) < (b >>> 0) ? 1 : 0;
    else continue;
    s -= 2; D[s++] = res;
  }
}

for (const id of readdirSync(I).sort()) {
  const p = readFileSync(join(I, id, 'program.bin'));
  const inp = readFileSync(join(I, id, 'input.bin'));
  const { out, exit } = run(p, inp);
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), out);
  writeFileSync(join(O, id, 'exit.txt'), exit + '\n');
}