# tiny-stack-vm-01 — entry

Entry for make.fun's Tiny stack virtual machine bounty:
https://make.fun/bounty/tiny-stack-vm-01-run-20261122

`main.ts` (Node 22, no dependencies) runs every instance of a set in one
run: reads `/input/<id>/program.bin` + `input.bin`, writes
`/output/<id>/stdout.bin` and `/output/<id>/exit.txt`, matching the
reference VM's output bytes and exit codes exactly, traps included.

Verified locally against the practice kit: 40/40 instances identical to
the reference VM (stdout + exit code).
