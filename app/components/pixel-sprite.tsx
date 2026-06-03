"use client";

const spritePalette: Record<string, string> = {
  ".": "transparent",
  A: "#101820",
  B: "#f4d35e",
  C: "#1f8a70",
  D: "#44c2b8",
  E: "#d95d39",
  F: "#f7f0d6",
  G: "#6b4f3f",
  H: "#8a8f98",
  I: "#c9d1d9",
  J: "#7a4cff",
  K: "#2f4858",
  L: "#d7263d",
  M: "#92d050",
  N: "#3b6ea8",
  O: "#9b5de5",
  P: "#f15bb5",
  Q: "#00bbf9",
  R: "#7ddc6f",
  S: "#f8a13f"
};

const sprites: Record<string, string[]> = {
  hero: [
    ".....BB.....",
    "....BFFB....",
    "....FAFB....",
    "...BBABB....",
    "..CCBCBCC...",
    "..C.CBC.C...",
    "....CBC.....",
    "...GG.GG....",
    "...G...G....",
    "..HH...HH...",
    ".HH.....HH.."
  ],
  town: [
    "..SS....SS..",
    ".SFFS..SFFS.",
    ".SFFS..SFFS.",
    ".SGGS..SGGS.",
    "SSGGSSSSGGSS",
    "SNNNNSSNNNNS",
    "SNAANSSNAANS",
    "SNNNNSSNNNNS",
    "SSSSSSSSSSSS",
    "..RRRRRRRR..",
    ".RRRRRRRRRR."
  ],
  slime: [
    "............",
    "............",
    "....DDDD....",
    "...DQQQQD...",
    "..DQQFFQQD..",
    "..DQQAAQQD..",
    "..DQQQQQQD..",
    "...DQQQQD...",
    "....DDDD....",
    "...D....D...",
    "............"
  ],
  bandit: [
    ".....GG.....",
    "....GFFG....",
    "...GFAAFG...",
    "..HHHGGHHH..",
    ".H..GEEG..H.",
    "....GEEG....",
    "...GG..GG...",
    "...G....G...",
    "..HH....HH..",
    ".HH......HH.",
    "............"
  ],
  knight: [
    ".....II.....",
    "....IAAI....",
    "...IIAAII...",
    "..IIIIIIII..",
    "..IILLLLII..",
    ".IIIKKKKIII.",
    "....IKKI....",
    "...II..II...",
    "..II....II..",
    ".II......II.",
    "............"
  ],
  mage: [
    ".....OO.....",
    "....OQQO....",
    "...OFAAFQ...",
    "..OOOJJOOO..",
    ".O..OJJQ..O.",
    "....OJJQ....",
    "...OO..OO...",
    "...O....O...",
    "..PP....PP..",
    ".PP......PP.",
    "............"
  ],
  warden: [
    ".....QQ.....",
    "....QIIQ....",
    "...QIAAIQ...",
    "..QQQNNQQQ..",
    ".Q..NLLN..Q.",
    "....NLLN....",
    "...QQNNQQ...",
    "..QQ....QQ..",
    ".QQ......QQ.",
    "QQ........QQ",
    "............"
  ]
};

export function PixelSprite({
  spriteId,
  label,
  mini = false
}: {
  spriteId: string;
  label: string;
  mini?: boolean;
}) {
  const rows = sprites[spriteId] ?? sprites.slime;
  return (
    <div
      className={mini ? "pixel-sprite mini" : "pixel-sprite"}
      role="img"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${rows[0].length}, 1fr)` }}
    >
      {rows.join("").split("").map((pixel, index) => (
        <span
          key={`${pixel}-${index}`}
          style={{ background: spritePalette[pixel] ?? "transparent" }}
        />
      ))}
    </div>
  );
}
