---
name: z80-coder
description: Guidance and knowledge about the Z80 processor, with constraints and general rules-of-thumb
---

# Z80 Coder

Use this skill to analyze decisions about implementing on and around the Z80 processor.

## Registers

| Name | Usage |
| :---: | :---- |
| `B` | General purpose, upper byte of pair `BC` |
| `C` | General purpose, lower byte of pair `BC` |
| `D` | General purpose, upper byte of pair `DE` |
| `E` | General purpose, lower byte of pair `DE` |
| `H` | General purpose, upper byte of pair `HL` |
| `L` | General purpose, lower byte of pair `HL` |
| `A` | Main accumulator, general purpose, upper byte of pair `AF` |
| `F` | Flags register, lower byte of pair `AF` |
| `BC` | General purpose, register pair of `B` and `C` |
| `DE` | General purpose, register pair of `D` and `E` |
| `HL` | General purpose, register pair of `H` and `L` |
| `SP` | Stack pointer |
| `PC` | Program counter |
| `IX` | Index register |
| `IY` | Index register |
| `I` | Interrupt vector base register (used in interrupt mode 2) |
| `R` | Memory refresh register, increments on every opcode fetch |
| `AF'`, `BC'`, `DE'`, `HL'` | Shadow (alternate) register set, swapped in via `EX AF, AF'` / `EXX` |
| `IXH` / `IXL` | Undocumented, upper/lower byte of `IX` |
| `IYH` / `IYL` | Undocumented, upper/lower byte of `IY` |



## Implicit uses

Beyond general-purpose use and pair membership, several registers are pressed into service as implicit operands for specific instructions:

| Register | Special-purpose role |
| :---: | :---- |
| `B` | `DJNZ` counter; also the loop counter for the I/O block instructions (`INI`/`IND`/`INIR`/`INDR`/`OUTI`/`OUTD`/`OTIR`/`OTDR`) — decremented each pass, repeat continues until `B==0` |
| `BC` | Byte counter for the LD/CP block instructions (`LDI`/`LDD`/`LDIR`/`LDDR`/`CPI`/`CPD`/`CPIR`/`CPDR`) — decremented each pass; `LDIR`/`LDDR`/`CPIR`/`CPDR` repeat until `BC==0` |
| `C` | Low byte of the I/O port address for `IN r,(C)`/`OUT (C),r` and the I/O block instructions (`B` supplies the high address byte during the actual bus cycle) |
| `HL` | The implicit `(HL)` memory operand wherever the 3-bit register code `110` appears (`INC (HL)`, `LD (HL),n`, `ADD A,(HL)`, etc.); also the operand for `JP (HL)` and `EX (SP),HL`; source pointer for `LDI`/`LDIR`/`CPI`/`CPIR`/`OUTI`/`OTIR` |
| `DE` | Destination pointer for `LDI`/`LDD`/`LDIR`/`LDDR` |
| `A` | Implicit destination/operand for essentially every 8-bit ALU op; the comparison value for `CPI`/`CPIR`/`CPD`/`CPDR` |
| `SP` | Implicit for `CALL`/`RET`/`RST`/`PUSH`/`POP` and hardware interrupt acknowledgement |
| `I` | Forms the high byte of the interrupt vector address in Interrupt Mode 2 — the peripheral drives the low byte onto the data bus |
| `R` | Auto-increments every opcode-fetch (M1) cycle — historically used to drive DRAM refresh. Readable via `LD A,R`, which has a documented side effect: it sets `S`/`Z` from the value and `P/V` from `IFF2`, resets `H`/`N`, and leaves `C` alone |



## Instruction set

This covers the full documented opcode map. Meaning is encoded in pseudo-Verilog assignments.

**Notation**

| Pattern | Selector bits | Options | Meaning |
| -- | -- | -- | -- |
| `reg2` | nn | `<BC, DE, HL, SP>` | 2-bit code: `00`=`BC`, `01`=`DE`, `10`=`HL`, `11`=`SP` |
| `reg2p` | nn | `<BC, DE, HL, SP>` | 2-bit code: `00`=`BC`, `01`=`DE`, `10`=`HL`, `11`=`AF` |
| `reg2x` | nn | `<BC, DE, IX, SP>`/`<BC, DE, IY, SP>` | 2-bit code: `00`=`BC`, `01`=`DE`, `10`=`IX`/`IY`, `11`=`SP` |
| `reg2b` | n | `<BC, DE>` | 1-bit code: `0`=`BC`, `1`=`DE` |
| `reg`, `regA`, `regB` | nnn, aaa, bbb | `<B, C, D, E, H, L, (HL), A>` | 3-bit code: `000`=`B`, `001`=`C`, `010`=`D`, `011`=`E`, `100`=`H`, `101`=`L`, `110`=`(HL)`, `111`=`A` |
| `regx` | nnn, aaa, bbb | `<B, C, D, E, H, L, A>` | 3-bit code: `000`=`B`, `001`=`C`, `010`=`D`, `011`=`E`, `100`=`H`, `101`=`L`, `110`=`(HL)`, `111`=`A` |
| `cc` | ccc | `<NZ, Z, NC, C, PO, PE, P, M>` | 3-bit code: `000`=`NZ`, `001`=`Z`, `010`=`NC`, `011`=`C`, `100`=`PO`, `101`=`PE`, `110`=`P`, `111`=`M` |
| `cc1` | cc | `<NZ, Z, NC, C>` | 2-bit code: `00`=`NZ`, `01`=`Z`, `10`=`NC`, `11`=`C` |
| `b` | bbb |  `<0..7>` | 3-bit literal bit index, used directly by `BIT`/`SET`/`RES` |
| `abcd` | ccccdddd aaaabbbb | 2-byte immediates | Little-endian byte order |
| `t` | `<00H, 08H, 10H, 18H, 20H, 28H, 30H, 38H>` | Reset address vector | 3-bit code: `000`=`00H`, `001`=`08H`, `010`=`10H`, `011`=`18H`, `100`=`20H`, `101`=`28H`, `110`=`30H`, `111`=`38H` |
| | | `mem(addr, val)` / `A = mem(addr)` | 8-bit memory access |
| | | `mem16(addr, val)` / `reg2 = mem16(addr)` | 16-bit memory access, low byte first |
| | | `(C)` | I/O port addressed by the full 16-bit `BC` (`B`=high byte, `C`=low byte) — `IN`/`OUT` with an explicit operand instead use just the immediate 8-bit port on the low half of the address bus |

### Unprefixed instructions (`0x00`–`0xFF`)

| Opcode Mnemonic | Binary Byte Pattern | Pseudocode | Cycles | Flags |
| -- | -- | -- | -- | -- |
| `NOP` | 0x00 | No operation | 4 | unaffected |
| `LD reg2, abcd` | 00nn0001 ccccdddd aaaabbbb | `reg2 = abcd` | 10 | unaffected |
| `LD reg2b, A` | 000n0010 | `mem(reg2b, A)` | 7 | unaffected |
| `LD A, (reg2b)` | 000n1010 | `A = mem(reg2b)` | 7 | unaffected |
| `INC reg2` | 00nn0011 | `++reg2` | 6 | unaffected |
| `DEC reg2` | 00nn1011 | `--reg2` | 6 | unaffected |
| `INC reg` | 00nnn100 | `++reg` | `reg==(HL) ? 11 : 4` | `SZ#H#V0-` |
| `DEC reg` | 00nnn101 | `--reg` | `reg==(HL) ? 11 : 4` | `SZ#H#V1-` |
| `LD reg, ab` | 00nnn110 aaaabbbb | `reg = ab` | `reg==(HL) ? 10 : 7` | unaffected |
| `RLCA` | 00000111 | `A = {A[6:0], A[7]}` | 4 | `--#0#-0C` |
| `EX AF, AF'` | 00001000 | `{AF, AF'} = {AF', AF}` | 4 | contents of `F'` |
| `ADD HL, reg2` | 00nn1001 | `HL += reg2` | 11 | `--#H#-0C` |
| `RRCA` | 00001111 | `A = {A[0], A[7:1]}` | 4 | `--#0#-0C` |
| `DJNZ d` | 00010000 dddddddd | `if (--B == 0) PC += d` | 13/8 | unaffected |
| `RLA` | 00010111 | `{F.C, A} = {A, F.C}` | 4 | `--#0#-0C` |
| `JR d` | 00011000 dddddddd | `PC += d` | 12 | unaffected |
| `RRA` | 00011111 | `{F.C, A} = {A[0], F.C, A[7:1]}` | 4 | `--#0#-0C` |
| `JR cc1, d` | 001nn000 dddddddd | `if (cc1) PC += d` | 12/7 | unaffected |
| `LD (abcd), HL` | 00100010 ccccdddd aaaabbbb | `mem16(abcd, HL)` | 16 | unaffected |
| `DAA` | 00100111 | `A = daa(A, F)`¹ | 4 | `SZ#H#P-C` |
| `LD HL, (abcd)` | 00101010 ccccdddd aaaabbbb | `HL = mem16(abcd)` | 16 | unaffected |
| `CPL` | 00101111 | `A = ~A` | 4 | `--#1#-1-` |
| `LD (abcd), A` | 00110010 ccccdddd aaaabbbb | `mem(abcd, A)` | 13 | unaffected |
| `SCF` | 00110111 | `F.C = 1` | 4 | `--#0#-01` |
| `LD A, (abcd)` | 00111010 ccccdddd aaaabbbb | `A = mem(abcd)` | 13 | unaffected |
| `CCF` | 00111111 | `F.C = ~F.C`² | 4 | `--#H#-0C` |
| `LD regA, regB` | 01dddsss | `R1 = R2` | `R1==(HL) \|\| R2==(HL) ? 7 : 4` | unaffected |
| `HALT` | 01110110 | `halt until interrupt` | 4 | unaffected |
| `ADD A, reg` | 10000nnn | `A += reg` | `reg==(HL) ? 7 : 4` | `SZ#H#V0C` |
| `ADC A, reg` | 10001nnn | `A += reg + F.C` | `reg==(HL) ? 7 : 4` | `SZ#H#V0C` |
| `SUB reg` | 10010nnn | `A -= reg` | `reg==(HL) ? 7 : 4` | `SZ#H#V1C` |
| `SBC A, reg` | 10011nnn | `A -= reg + F.C` | `reg==(HL) ? 7 : 4` | `SZ#H#V1C` |
| `AND reg` | 10100nnn | `A &= reg` | `reg==(HL) ? 7 : 4` | `SZ#1#P00` |
| `XOR reg` | 10101nnn | `A ^= reg` | `reg==(HL) ? 7 : 4` | `SZ#0#P00` |
| `OR reg` | 10110nnn | `A \|= reg` | `reg==(HL) ? 7 : 4` | `SZ#0#P00` |
| `CP reg` | 10111nnn | `flags(A - R)` | `reg==(HL) ? 7 : 4` | `SZ#H#V1C` |
| `RET cc=<NZ, Z, NC, C, PO, PE, P, M>` | 11nnn000 | `if (cc) return` | 11/5 | unaffected |
| `POP reg2p` | 11nn0001 | `reg2p = pop()` | 10 | unaffected³ |
| `JP cc=<...>, abcd` | 11nnn010 ccccdddd aaaabbbb | `if (cc) PC = abcd` | 10 | unaffected |
| `JP abcd` | 11000011 ccccdddd aaaabbbb | `PC = abcd` | 10 | unaffected |
| `OUT (ab), A` | 11010011 aaaabbbb | `io_write(ab, A)` | 11 | unaffected |
| `CALL cc=<...>, abcd` | 11nnn100 ccccdddd aaaabbbb | `if (cc) call(abcd)` | 17/10 | unaffected |
| `PUSH reg2p` | 11nn0101 | `push(reg2p)` | 11 | unaffected |
| `ADD A, ab` | 11000110 aaaabbbb | `A += ab` | 7 | `SZ#H#V0C` |
| `ADC A, ab` | 11001110 aaaabbbb | `A += ab + F.C` | 7 | `SZ#H#V0C` |
| `SUB ab` | 11010110 aaaabbbb | `A -= ab` | 7 | `SZ#H#V1C` |
| `SBC A, ab` | 11011110 aaaabbbb | `A -= ab + F.C` | 7 | `SZ#H#V1C` |
| `AND ab` | 11100110 aaaabbbb | `A &= ab` | 7 | `SZ#1#P00` |
| `XOR ab` | 11101110 aaaabbbb | `A ^= ab` | 7 | `SZ#0#P00` |
| `OR ab` | 11110110 aaaabbbb | `A \|= ab` | 7 | `SZ#0#P00` |
| `CP ab` | 11111110 aaaabbbb | `flags(A - ab)` | 7 | `SZ#H#V1C` |
| `RST t=<00H, 08H, 10H, 18H, 20H, 28H, 30H, 38H>` | 11nnn111 | `call(t)` | 11 | unaffected |
| `RET` | 11001001 | `return` | 10 | unaffected |
| `EXX` | 11011001 | `{BC, DE, HL, BC', DE', HL'} = {BC', DE', HL', BC, DE, HL}` | 4 | unaffected |
| `IN A, (ab)` | 11011011 aaaabbbb | `A = io_read(ab)` | 11 | unaffected |
| `EX (SP), HL` | 11100011 | `{HL, mem16(SP)} = {mem16(SP), HL}` | 19 | unaffected |
| `JP (HL)` | 11101001 | `PC = HL` | 4 | unaffected |
| `EX DE, HL` | 11101011 | `{DE, HL} = {HL, DE}` | 4 | unaffected |
| `DI` | 11110011 | `IFF1 = IFF2 = 0` | 4 | unaffected |
| `CALL abcd` | 11001101 ccccdddd aaaabbbb | `call(abcd)` | 17 | unaffected |
| `LD SP, HL` | 11111001 | `SP = HL` | 6 | unaffected |
| `EI` | 11111011 | `IFF1 = IFF2 = 1` | 4 | unaffected |

¹ `DAA` adjusts `A` after a BCD add/subtract based on its current value and the `N`/`H`/`C` flags; the adjustment table is more involved than fits a one-line pseudocode.
² `CCF` copies the *previous* value of `F.C` into `F.H` before toggling `F.C` — a documented hardware quirk, not a general half-carry computation.
³ `POP AF` is the exception: it loads `F` directly from the popped byte, so the flags become whatever was on the stack.

### `CB`-prefixed instructions (bit operations)

All entries are two bytes: `0xCB` followed by the byte shown below.

| Opcode Mnemonic | Second Byte Pattern | Pseudocode | Cycles | Flags |
| -- | -- | -- | -- | -- |
| `RLC reg` | 00000nnn | `reg = {reg[6:0], reg[7]}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `RRC reg` | 00001nnn | `reg = {reg[0], reg[7:1]}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `RL reg` | 00010nnn | `{F.C, reg} = {reg[7], reg[6:0], F.C}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `RR reg` | 00011nnn | `{F.C, reg} = {reg[0], F.C, reg[7:1]}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `SLA reg` | 00100nnn | `reg = {reg[6:0], 0}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `SRA reg` | 00101nnn | `reg = {reg[7], reg[7:1]}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `SLL reg`⁴ | 00110nnn | `reg = {reg[6:0], 1}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `SRL reg` | 00111nnn | `reg = {0, reg[7:1]}` | `reg==(HL) ? 15 : 8` | `SZ#0#P0C` |
| `BIT b, reg` | 01bbbnnn | `F.Z = !reg[b]`⁵ | `reg==(HL) ? 12 : 8` | `SZ#1#V0-`⁵ |
| `RES b, reg` | 10bbbnnn | `R &= ~(1 << b)` | `reg==(HL) ? 15 : 8` | unaffected |
| `SET b, reg` | 11bbbnnn | `R \|= (1 << b)` | `reg==(HL) ? 15 : 8` | unaffected |

Unlike `RLCA`/`RRCA`/`RLA`/`RRA`, these `CB`-prefixed rotate/shift forms (including on `A`) *do* update `S`, `Z`, and `P/V`.

⁴ `SLL` (also seen as `SLI`/`SL1`) is undocumented: it shifts a `1` into bit 0 instead of a `0`.
⁵ For `BIT b,R`: `S` mirrors the tested bit only when `b=7` (`0` otherwise); `P/V` is officially undefined but conventionally mirrors `Z`; `C` is unaffected. `BIT b,(HL)` also perturbs the undocumented flag bits based on internal bus contents (`MEMPTR`), which isn't modeled here.

### `ED`-prefixed instructions (extended)

All entries are two bytes: `0xED` followed by the byte shown below. Most other second bytes (`0x00`–`0x3F`, most of `0x80`–`0x9F`, and `0xBC`–`0xFF`) are undefined — real hardware executes them as an 8 T-state `NOP` (sometimes called `NONI`), but this isn't guaranteed across all chip revisions/clones and shouldn't be relied on.

| Opcode Mnemonic | Second Byte Pattern | Pseudocode | Cycles | Flags |
| -- | -- | -- | -- | -- |
| `IN reg, (C)` | 01nnn000 | `R = io_read(C)`⁶ | 12 | `SZ#0#P0-` |
| `OUT (C), reg` | 01nnn001 | `io_write(C, R)`⁶ | 12 | unaffected |
| `SBC HL, RR=<BC, DE, HL, SP>` | 01nn0010 | `HL -= RR + F.C` | 15 | `SZ#H#V1C` |
| `ADC HL, reg2` | 01nn1010 | `HL += RR + F.C` | 15 | `SZ#H#V0C` |
| `LD (abcd), RR=<BC, DE, HL, SP>` | 01nn0011 ccccdddd aaaabbbb | `mem16(abcd, RR)` | 20 | unaffected |
| `LD RR=<BC, DE, HL, SP>, (abcd)` | 01nn1011 ccccdddd aaaabbbb | `RR = mem16(abcd)` | 20 | unaffected |
| `NEG` | 01000100 | `A = 0 - A` | 8 | `SZ#H#V1C` |
| `RETN` | 01000101 | `return; IFF1 = IFF2` | 14 | unaffected |
| `RETI` | 01001101 | `return`⁷ | 14 | unaffected |
| `IM 0` | 01000110 | `interrupt_mode = 0` | 8 | unaffected |
| `IM 1` | 01010110 | `interrupt_mode = 1` | 8 | unaffected |
| `IM 2` | 01011110 | `interrupt_mode = 2` | 8 | unaffected |
| `LD I, A` | 01000111 | `I = A` | 9 | unaffected |
| `LD R, A` | 01001111 | `R = A` | 9 | unaffected |
| `LD A, I` | 01010111 | `A = I` | 9 | `SZ#0#V0-`⁸ |
| `LD A, R` | 01011111 | `A = R` | 9 | `SZ#0#V0-`⁸ |
| `RRD` | 01100111 | 4-bit rotate right across `A[3:0]` and `mem(HL)`⁹ | 18 | `SZ#0#P0-` |
| `RLD` | 01101111 | 4-bit rotate left across `A[3:0]` and `mem(HL)`⁹ | 18 | `SZ#0#P0-` |
| `LDI` | 10100000 | `mem(DE, mem(HL)); ++DE; ++HL; --BC` | 16 | `--#0#V0-`¹⁰ |
| `LDD` | 10101000 | `mem(DE, mem(HL)); --DE; --HL; --BC` | 16 | `--#0#V0-`¹⁰ |
| `LDIR` | 10110000 | `do LDI while (BC != 0)` | 21/16 | `--#0#00-` |
| `LDDR` | 10111000 | `do LDD while (BC != 0)` | 21/16 | `--#0#00-` |
| `CPI` | 10100001 | `flags(A - mem(HL)); ++HL; --BC` | 16 | `SZ#H#V1-`¹⁰ |
| `CPD` | 10101001 | `flags(A - mem(HL)); --HL; --BC` | 16 | `SZ#H#V1-`¹⁰ |
| `CPIR` | 10110001 | `do CPI while (BC != 0 && A != mem(HL))` | 21/16 | `SZ#H#V1-`¹⁰ |
| `CPDR` | 10111001 | `do CPD while (BC != 0 && A != mem(HL))` | 21/16 | `SZ#H#V1-`¹⁰ |
| `INI` | 10100010 | `mem(HL, io_read(C)); ++HL; --B` | 16 | `?Z?1??`¹¹ |
| `IND` | 10101010 | `mem(HL, io_read(C)); --HL; --B` | 16 | `?Z?1??`¹¹ |
| `INIR` | 10110010 | `do INI while (B != 0)` | 21/16 | `?1?1??`¹¹ |
| `INDR` | 10111010 | `do IND while (B != 0)` | 21/16 | `?1?1??`¹¹ |
| `OUTI` | 10100011 | `io_write(C, mem(HL)); ++HL; --B` | 16 | `?Z?1??`¹¹ |
| `OUTD` | 10101011 | `io_write(C, mem(HL)); --HL; --B` | 16 | `?Z?1??`¹¹ |
| `OTIR` | 10110011 | `do OUTI while (B != 0)` | 21/16 | `?1?1??`¹¹ |
| `OTDR` | 10111011 | `do OUTD while (B != 0)` | 21/16 | `?1?1??`¹¹ |

⁶ The `R=(HL)` slot in `IN`/`OUT` is undocumented: `IN (C)` reads and sets flags but discards the result (sometimes written `IN F,(C)`); `OUT (C),(HL)`-slot outputs a constant `0`.
⁷ `RETI` also signals daisy-chained interrupt controllers (e.g. on the Z80 PIO/CTC/SIO) that interrupt servicing is complete; functionally it returns like `RETN` but doesn't restore `IFF1` from `IFF2`.
⁸ `P/V` here copies `IFF2` rather than a parity/overflow computation — a documented trick for checking whether a maskable interrupt is pending right after an NMI.
⁹ `RRD`: `{A[3:0], mem(HL)[7:4], mem(HL)[3:0]} = {mem(HL)[3:0], A[3:0], mem(HL)[7:4]}`. `RLD`: `{A[3:0], mem(HL)[7:4], mem(HL)[3:0]} = {mem(HL)[7:4], mem(HL)[3:0], A[3:0]}`.
¹⁰ `P/V` reflects whether `BC != 0` *after* the decrement (used to detect an incomplete block); for the repeating forms it's always `0` on completion, since they only stop once `BC == 0` (or, for `CPIR`/`CPDR`, also stop early on a match).
¹¹ Per the original Zilog documentation, only `Z` (set if `B==0` after decrement) and `N` (always set) are officially defined for the block I/O instructions; `S`, `H`, `P/V`, and `C` are documented as unknown/undefined (reverse-engineered formulas exist but vary by source, so they're omitted here).

Every documented `NEG`, `RETN`, and `IM` opcode above also has undocumented duplicate encodings elsewhere in `0x40`–`0x7F` (e.g. `0x4C`/`0x54`/`0x5C`/`0x64`/`0x6C`/`0x74`/`0x7C` all also act as `NEG`) — omitted here since they're redundant with the canonical byte listed.

### `IX`/`IY`-indexed instructions (`0xDD`/`0xFD`)

`0xDD` and `0xFD` redirect `HL`-based addressing to `IX` and `IY` respectively — the two prefixes are otherwise identical, so everything below applies to both; just substitute `IY`/`IYH`/`IYL` for `IX`/`IXH`/`IXL` and `0xFD` for `0xDD`. If the opcode following the prefix doesn't reference `HL`, `H`, `L`, or `(HL)`, the prefix has no effect — the instruction executes exactly as its unprefixed form, just 4 T-states slower for the wasted prefix fetch — so those redundant encodings aren't listed below. Prefixes can also stack (`DD DD ..`, `DD FD ..`); only the last one before a real opcode applies, and each extra one costs another 4 T-states. A prefix immediately followed by `0xED` is likewise ignored, since `ED`-prefixed instructions have no indexed form.

**16-bit `IX` operations**

| Opcode Mnemonic | Byte Pattern (after `0xDD`) | Pseudocode | Cycles | Flags |
| -- | -- | -- | -- | -- |
| `LD IX, abcd` | 00100001 ccccdddd aaaabbbb | `IX = abcd` | 14 | unaffected |
| `LD (abcd), IX` | 00100010 ccccdddd aaaabbbb | `mem16(abcd, IX)` | 20 | unaffected |
| `LD IX, (abcd)` | 00101010 ccccdddd aaaabbbb | `IX = mem16(abcd)` | 20 | unaffected |
| `INC IX` | 00100011 | `++IX` | 10 | unaffected |
| `DEC IX` | 00101011 | `--IX` | 10 | unaffected |
| `ADD IX, RR=<BC, DE, IX, SP>` | 00nn1001 | `IX += RR` | 15 | `--#H#-0C` |
| `POP IX` | 11100001 | `IX = pop()` | 14 | unaffected |
| `PUSH IX` | 11100101 | `push(IX)` | 15 | unaffected |
| `EX (SP), IX` | 11100011 | `{IX, mem16(SP)} = {mem16(SP), IX}` | 23 | unaffected |
| `JP (IX)` | 11101001 | `PC = IX` | 8 | unaffected |
| `LD SP, IX` | 11111001 | `SP = IX` | 10 | unaffected |

**Undocumented `IXH`/`IXL` 8-bit operations**

None of this is officially documented by Zilog, but it's consistent, well-tested behavior on real NMOS/CMOS silicon and widely relied upon in existing code.

| Opcode Mnemonic | Byte Pattern (after `0xDD`) | Pseudocode | Cycles | Flags |
| -- | -- | -- | -- | -- |
| `INC R=<IXH, IXL>` | 00nnn100 | `++R` | 8 | `SZ#H#V0-` |
| `DEC R=<IXH, IXL>` | 00nnn101 | `--R` | 8 | `SZ#H#V1-` |
| `LD R=<IXH, IXL>, n` | 00nnn110 nnnnnnnn | `R = n` | 11 | unaffected |
| `LD R1=<B, C, D, E, IXH, IXL, A>, R2=<B, C, D, E, IXH, IXL, A>`¹² | 01dddsss | `R1 = R2` | 8 | unaffected |
| `ADD A, R=<IXH, IXL>` | 10000nnn | `A += R` | 8 | `SZ#H#V0C` |
| `ADC A, R=<IXH, IXL>` | 10001nnn | `A += R + F.C` | 8 | `SZ#H#V0C` |
| `SUB R=<IXH, IXL>` | 10010nnn | `A -= R` | 8 | `SZ#H#V1C` |
| `SBC A, R=<IXH, IXL>` | 10011nnn | `A -= R + F.C` | 8 | `SZ#H#V1C` |
| `AND R=<IXH, IXL>` | 10100nnn | `A &= R` | 8 | `SZ#1#P00` |
| `XOR R=<IXH, IXL>` | 10101nnn | `A ^= R` | 8 | `SZ#0#P00` |
| `OR R=<IXH, IXL>` | 10110nnn | `A \|= R` | 8 | `SZ#0#P00` |
| `CP R=<IXH, IXL>` | 10111nnn | `flags(A - R)` | 8 | `SZ#H#V1C` |

**`(IX+d)` memory operations**

`d` is a signed (two's complement) displacement, `-128`–`127`, added to `IX`.

| Opcode Mnemonic | Byte Pattern (after `0xDD`) | Pseudocode | Cycles | Flags |
| -- | -- | -- | -- | -- |
| `LD regx, (IX+d)` | 01nnn110 dddddddd | `R = mem(IX + d)` | 19 | unaffected |
| `LD (IX+d), regx` | 01110nnn dddddddd | `mem(IX + d, R)` | 19 | unaffected |
| `LD (IX+d), n` | 00110110 dddddddd nnnnnnnn | `mem(IX + d, n)` | 19 | unaffected |
| `INC (IX+d)` | 00110100 dddddddd | `++mem(IX + d)` | 23 | `SZ#H#V0-` |
| `DEC (IX+d)` | 00110101 dddddddd | `--mem(IX + d)` | 23 | `SZ#H#V1-` |
| `ADD A, (IX+d)` | 10000110 dddddddd | `A += mem(IX + d)` | 19 | `SZ#H#V0C` |
| `ADC A, (IX+d)` | 10001110 dddddddd | `A += mem(IX + d) + F.C` | 19 | `SZ#H#V0C` |
| `SUB (IX+d)` | 10010110 dddddddd | `A -= mem(IX + d)` | 19 | `SZ#H#V1C` |
| `SBC A, (IX+d)` | 10011110 dddddddd | `A -= mem(IX + d) + F.C` | 19 | `SZ#H#V1C` |
| `AND (IX+d)` | 10100110 dddddddd | `A &= mem(IX + d)` | 19 | `SZ#1#P00` |
| `XOR (IX+d)` | 10101110 dddddddd | `A ^= mem(IX + d)` | 19 | `SZ#0#P00` |
| `OR (IX+d)` | 10110110 dddddddd | `A \|= mem(IX + d)` | 19 | `SZ#0#P00` |
| `CP (IX+d)` | 10111110 dddddddd | `flags(A - mem(IX + d))` | 19 | `SZ#H#V1C` |

**`(IX+d)` bit operations (`0xDD 0xCB d op`)**

Note the byte order: the displacement comes *before* the final opcode byte here, unlike every other indexed form above. Also undocumented: for the rotate/shift/`RES`/`SET` rows, the low 3 bits of the opcode byte don't have to be `110` — other values perform the same operation on `(IX+d)` but *also* copy the result into the corresponding register. The `110` form shown here is the canonical, always-valid one.

| Opcode Mnemonic | Byte Pattern (after `0xDD`) | Pseudocode | Cycles | Flags |
| -- | -- | -- | -- | -- |
| `RLC (IX+d)` | CB dddddddd 00000110 | `mem(IX+d) = {mem(IX+d)[6:0], mem(IX+d)[7]}` | 23 | `SZ#0#P0C` |
| `RRC (IX+d)` | CB dddddddd 00001110 | `mem(IX+d) = {mem(IX+d)[0], mem(IX+d)[7:1]}` | 23 | `SZ#0#P0C` |
| `RL (IX+d)` | CB dddddddd 00010110 | `{F.C, mem(IX+d)} = {mem(IX+d)[7], mem(IX+d)[6:0], F.C}` | 23 | `SZ#0#P0C` |
| `RR (IX+d)` | CB dddddddd 00011110 | `{F.C, mem(IX+d)} = {mem(IX+d)[0], F.C, mem(IX+d)[7:1]}` | 23 | `SZ#0#P0C` |
| `SLA (IX+d)` | CB dddddddd 00100110 | `mem(IX+d) = {mem(IX+d)[6:0], 0}` | 23 | `SZ#0#P0C` |
| `SRA (IX+d)` | CB dddddddd 00101110 | `mem(IX+d) = {mem(IX+d)[7], mem(IX+d)[7:1]}` | 23 | `SZ#0#P0C` |
| `SLL (IX+d)`¹³ | CB dddddddd 00110110 | `mem(IX+d) = {mem(IX+d)[6:0], 1}` | 23 | `SZ#0#P0C` |
| `SRL (IX+d)` | CB dddddddd 00111110 | `mem(IX+d) = {0, mem(IX+d)[7:1]}` | 23 | `SZ#0#P0C` |
| `BIT b, (IX+d)` | CB dddddddd 01bbb110 | `F.Z = !mem(IX+d)[b]` | 20 | `SZ#1#V0-`¹⁴ |
| `RES b, (IX+d)` | CB dddddddd 10bbb110 | `mem(IX+d) &= ~(1 << b)` | 23 | unaffected |
| `SET b, (IX+d)` | CB dddddddd 11bbb110 | `mem(IX+d) \|= (1 << b)` | 23 | unaffected |

¹² Excludes any combination where either side is the `(HL)`/`(IX+d)` slot (code `110`) — those don't get the `H`/`L`→`IXH`/`IXL` substitution; `LD H,(IX+d)` and `LD (IX+d),L` really do use `H`/`L`, not `IXH`/`IXL`.
¹³ Same undocumented status as the `CB`-prefixed `SLL` above: shifts a `1` into bit 0.
¹⁴ Same caveats as `BIT b,R` above: `S` mirrors the tested bit only when `b=7`; `P/V` is officially undefined but conventionally mirrors `Z`; `C` is unaffected.

#### Flags effect legend

| Letter | Effect |
| -- | -- |
| `-` | unaffected |
| `#` | undocumented (bits 3/5 — commonly listed as not affected, though real silicon copies result bits 3/5 here) |
| `0` | reset |
| `1` | set |
| `S` | sign (bit 7) of result |
| `Z` | set if result is zero |
| `H` | half-carry (carry/borrow out of bit 3) |
| `P` | parity of result (even parity) — same physical bit as `V` |
| `V` | signed overflow of result — same physical bit as `P` |
| `N` | add/subtract flag — `0` after add-type ops, `1` after subtract-type ops (used by `DAA`) |
| `C` | carry/borrow out of bit 7, or out of the rotated/shifted bit |