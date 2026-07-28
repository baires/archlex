import type {
  CatalogManifest,
  RelationshipDefinition,
  ResourceDefinition,
  SanitizedIcon,
  SemanticRule,
} from "@cloudmer/model";

export function validateResourceDefinition(def: ResourceDefinition): boolean {
  return (
    typeof def.id === "string" &&
    def.id.length > 0 &&
    typeof def.displayName === "string" &&
    typeof def.category === "string" &&
    Array.isArray(def.aliases)
  );
}

export function validateRelationshipDefinition(
  def: RelationshipDefinition,
): boolean {
  return typeof def.kind === "string" && typeof def.displayName === "string";
}

export function validateSanitizedIcon(icon: SanitizedIcon): boolean {
  return (
    typeof icon.key === "string" &&
    typeof icon.checksum === "string" &&
    typeof icon.svgFragment === "string" &&
    typeof icon.viewBox === "string"
  );
}

export function validateCatalogManifest(manifest: CatalogManifest): boolean {
  return (
    typeof manifest.releaseId === "string" &&
    typeof manifest.checksum === "string" &&
    Array.isArray(manifest.services) &&
    manifest.services.every(validateResourceDefinition)
  );
}
