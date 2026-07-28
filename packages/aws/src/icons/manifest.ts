import type { CatalogManifest, SanitizedIcon } from "@cloudmer/model";

export const AWS_ICON_MANIFEST_CHECKSUM =
  "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";

export const AWS_SANITIZED_ICONS: Record<string, SanitizedIcon> = {
  "aws-rds-proxy": {
    key: "aws-rds-proxy",
    checksum:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#3B82F6"/><path d="M20 20h24v24H20z" fill="#FFFFFF"/>',
  },
  "aws-rds": {
    key: "aws-rds",
    checksum:
      "f4c1d55309fd2d250bfcf5d9997fc03538bf52f5750ca045b506002c8963c966",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#2563EB"/><ellipse cx="32" cy="24" rx="16" ry="6" fill="#FFFFFF"/>',
  },
  "aws-ecs": {
    key: "aws-ecs",
    checksum:
      "a5d2e66410fe3e361cfdf6ea008fd14649c063f6861db156c617113d9074da77",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#F97316"/><path d="M16 24h32v16H16z" fill="#FFFFFF"/>',
  },
  "aws-lambda": {
    key: "aws-lambda",
    checksum:
      "b6e3f77521ff4f472d0ee7fb119fe25750d17407972ec267d728224ea185eb88",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#F59E0B"/><path d="M20 44l12-24 12 24" stroke="#FFFFFF" stroke-width="4" fill="none"/>',
  },
  "aws-s3": {
    key: "aws-s3",
    checksum:
      "c7f4a886320a50583e1ff80c2200f36861e28518083fd378e839335fb296fc99",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#10B981"/><path d="M18 22h28l-4 20H22z" fill="#FFFFFF"/>',
  },
  "aws-dynamodb": {
    key: "aws-dynamodb",
    checksum:
      "d805b997431b61694f20091d3311047972f39629194fe489f94a4460c3a70daa",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#3B82F6"/><circle cx="32" cy="32" r="16" fill="#FFFFFF"/>',
  },
  "aws-sqs": {
    key: "aws-sqs",
    checksum:
      "e916ca08542c727a50311a2e44221580830407302a50f59a0a5b5571d4b81ebb",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#8B5CF6"/><rect x="18" y="26" width="28" height="12" fill="#FFFFFF"/>',
  },
  "aws-sns": {
    key: "aws-sns",
    checksum:
      "fa27db19653d838b61422b3f55332691941518413b6106ab1b6c6682e5c92fcc",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#EC4899"/><circle cx="32" cy="32" r="12" fill="#FFFFFF"/>',
  },
  "aws-alb": {
    key: "aws-alb",
    checksum:
      "0b38ec2a764e949c72533c4066443702052629524c7217bc2c7d7793f6da30dd",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#A855F7"/><path d="M16 32h32M32 16v32" stroke="#FFFFFF" stroke-width="4"/>',
  },
  "aws-vpc": {
    key: "aws-vpc",
    checksum:
      "1c49fd3b875fa5ad83644d5177554813163730635d8328cd3d8e88a407eb41ee",
    viewBox: "0 0 64 64",
    svgFragment:
      '<rect width="64" height="64" rx="8" fill="#64748B"/><rect x="14" y="14" width="36" height="36" fill="none" stroke="#FFFFFF" stroke-width="4"/>',
  },
};

export const AWS_CATALOG_MANIFEST: CatalogManifest = {
  releaseId: "2026-07-27-aws-official",
  retrievedAt: "2026-07-27T20:00:00Z",
  checksum: AWS_ICON_MANIFEST_CHECKSUM,
  services: [],
  icons: AWS_SANITIZED_ICONS,
};
