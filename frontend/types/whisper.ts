import { Idl } from "@coral-xyz/anchor";

export type Whisper = {
  version: "0.1.0";
  name: "whisper";
  instructions: [
    {
      name: "create_confession";
      accounts: [
        { name: "confession"; writable: true; pda: { seeds: [{ kind: "const"; value: [99, 111, 110, 102, 101, 115, 115, 105, 111, 110] }, { kind: "account"; path: "author" }] } },
        { name: "author"; writable: true; signer: true },
        { name: "systemProgram"; address: "11111111111111111111111111111111" }
      ];
      args: [{ name: "contentUri"; type: "string" }];
    },
    // Add other instructions as needed
  ];
  accounts: [
    {
      name: "ConfessionAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "author"; type: "pubkey" },
          { name: "contentUri"; type: "string" },
          { name: "likeCount"; type: "u64" },
          { name: "commentCount"; type: "u64" },
          { name: "timestamp"; type: "i64" },
          { name: "bump"; type: "u8" }
        ];
      };
    }
  ];
};
