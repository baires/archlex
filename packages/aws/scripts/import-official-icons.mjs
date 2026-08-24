import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOMParser } from "@xmldom/xmldom";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";

const ALLOWED_ELEMENTS = new Set([
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feDisplacementMap",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "feTile",
  "feTurbulence",
  "filter",
  "g",
  "image",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "symbol",
  "title",
  "use",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "class",
  "clip-path",
  "clip-rule",
  "clipPathUnits",
  "color-interpolation-filters",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "edgeMode",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "filterUnits",
  "flood-color",
  "flood-opacity",
  "fr",
  "fx",
  "fy",
  "gradientTransform",
  "gradientUnits",
  "height",
  "href",
  "id",
  "in",
  "in2",
  "k1",
  "k2",
  "k3",
  "k4",
  "mask",
  "maskContentUnits",
  "maskUnits",
  "mode",
  "offset",
  "opacity",
  "operator",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "points",
  "preserveAlpha",
  "preserveAspectRatio",
  "primitiveUnits",
  "r",
  "radius",
  "result",
  "rx",
  "ry",
  "scale",
  "spreadMethod",
  "stdDeviation",
  "stitchTiles",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tableValues",
  "targetX",
  "targetY",
  "transform",
  "type",
  "values",
  "viewBox",
  "width",
  "x",
  "x1",
  "x2",
  "xChannelSelector",
  "y",
  "y1",
  "y2",
  "yChannelSelector",
]);

const IRI_ATTRIBUTES = new Set([
  "clip-path",
  "fill",
  "filter",
  "mask",
  "stroke",
]);
const OMITTED_ROOT_ATTRIBUTES = new Set(["height", "version", "width"]);
const OMITTED_ELEMENTS = new Set(["title"]);
const ATTRIBUTE_ORDER = new Map(
  [
    "id",
    "class",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "width",
    "height",
    "viewBox",
    "fill",
    "fill-opacity",
    "fill-rule",
    "stroke",
    "stroke-width",
    "d",
  ].map((name, index) => [name, index]),
);
const SVG_NUMBER_SOURCE = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
const VIEWBOX_PATTERN = new RegExp(
  `^\\s*(${SVG_NUMBER_SOURCE})(?:\\s*,\\s*|\\s+)(${SVG_NUMBER_SOURCE})(?:\\s*,\\s*|\\s+)(${SVG_NUMBER_SOURCE})(?:\\s*,\\s*|\\s+)(${SVG_NUMBER_SOURCE})\\s*$`,
);

function failSvg(sourceName, reason) {
  throw new Error(`${sourceName}: ${reason}`);
}

function validateViewBox(viewBox, sourceName) {
  const match = viewBox.match(VIEWBOX_PATTERN);
  if (!match) {
    failSvg(sourceName, "viewBox must contain exactly four finite numbers");
  }

  const values = match.slice(1).map(Number);
  if (!values.every(Number.isFinite)) {
    failSvg(sourceName, "viewBox must contain exactly four finite numbers");
  }
  if (values[2] <= 0 || values[3] <= 0) {
    failSvg(sourceName, "viewBox width and height must be positive");
  }
}

function escapeXmlAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXmlText(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fragmentReference(value) {
  const match = value.match(/^#([^\s#"'()<>]+)$/);
  return match?.[1];
}

function fragmentUrlReference(value) {
  const match = value.match(
    /^url\(\s*(?:(["'])#([^\s#"'()<>]+)\1|#([^\s#"'()<>]+))\s*\)$/i,
  );
  return match?.[2] ?? match?.[3];
}

function parseSvgDocument(svg, sourceName) {
  if (typeof svg !== "string")
    failSvg(sourceName, "SVG input must be a string");

  const withoutDeclaration = svg
    .replace(/^\uFEFF/, "")
    .replace(/^\s*<\?xml\s[^?]*\?>/i, "");
  if (/<!\s*DOCTYPE\b/i.test(withoutDeclaration)) {
    failSvg(sourceName, "forbidden DOCTYPE or entity declaration");
  }
  if (/<!\s*ENTITY\b/i.test(withoutDeclaration)) {
    failSvg(sourceName, "forbidden entity declaration");
  }
  if (/<\?/.test(withoutDeclaration)) {
    failSvg(sourceName, "forbidden processing instruction");
  }

  const parseErrors = [];
  let document;
  try {
    document = new DOMParser({
      onError(level, message) {
        parseErrors.push(`${level}: ${message}`);
      },
    }).parseFromString(withoutDeclaration, "image/svg+xml");
  } catch (error) {
    failSvg(
      sourceName,
      `malformed XML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (parseErrors.length > 0) {
    failSvg(sourceName, `malformed XML: ${parseErrors[0]}`);
  }
  if (document.doctype) {
    failSvg(sourceName, "forbidden DOCTYPE or entity declaration");
  }
  return document;
}

function serializeSafeSvg(document, sourceName) {
  const root = document.documentElement;
  if (!root || root.localName !== "svg") {
    failSvg(sourceName, "root element must be svg");
  }

  const rootNamespace = root.namespaceURI ?? null;
  if (rootNamespace !== null && rootNamespace !== SVG_NAMESPACE) {
    failSvg(sourceName, `foreign root namespace ${rootNamespace}`);
  }

  const ids = new Set();
  const references = [];

  function serializeElement(element, isRoot = false) {
    const namespace = element.namespaceURI ?? null;
    const legacyUnqualifiedElement =
      rootNamespace === null && namespace === null && !element.prefix;
    if (namespace !== SVG_NAMESPACE && !legacyUnqualifiedElement) {
      failSvg(
        sourceName,
        `foreign namespace ${namespace ?? "(none)"} on ${element.nodeName}`,
      );
    }

    const name = element.localName;
    if (!ALLOWED_ELEMENTS.has(name)) {
      failSvg(sourceName, `unsupported or active element ${element.nodeName}`);
    }

    const attributes = [];
    const canonicalAttributeNames = new Set();
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      if (!attribute) continue;

      const attributeNamespace = attribute.namespaceURI ?? null;
      if (attributeNamespace === XMLNS_NAMESPACE) {
        if (
          attribute.value !== SVG_NAMESPACE &&
          attribute.value !== XLINK_NAMESPACE
        ) {
          failSvg(
            sourceName,
            `foreign namespace declaration ${attribute.value}`,
          );
        }
        continue;
      }
      if (
        attributeNamespace === XML_NAMESPACE ||
        attribute.name === "xml:base"
      ) {
        failSvg(sourceName, `forbidden XML attribute ${attribute.name}`);
      }
      if (
        attributeNamespace !== null &&
        !(
          attributeNamespace === XLINK_NAMESPACE &&
          attribute.localName === "href"
        )
      ) {
        failSvg(
          sourceName,
          `foreign attribute namespace ${attribute.namespaceURI}`,
        );
      }

      const attributeName =
        attributeNamespace === XLINK_NAMESPACE ? "href" : attribute.localName;
      if (isRoot && OMITTED_ROOT_ATTRIBUTES.has(attributeName)) continue;
      if (/^on/i.test(attributeName)) {
        failSvg(sourceName, `forbidden event attribute ${attribute.name}`);
      }
      if (attributeName === "style") {
        failSvg(sourceName, `forbidden active attribute ${attribute.name}`);
      }
      if (!ALLOWED_ATTRIBUTES.has(attributeName)) {
        failSvg(sourceName, `unsupported attribute ${attribute.name}`);
      }
      if (canonicalAttributeNames.has(attributeName)) {
        failSvg(sourceName, `duplicate attribute ${attributeName}`);
      }
      canonicalAttributeNames.add(attributeName);

      const value = attribute.value;
      if (/\b(?:data|file|https?|javascript):/i.test(value)) {
        failSvg(sourceName, `forbidden external IRI in ${attribute.name}`);
      }
      if (attributeName === "href") {
        const reference = fragmentReference(value);
        if (!reference) {
          failSvg(sourceName, `external non-fragment IRI in ${attribute.name}`);
        }
        references.push({ attribute: attributeName, target: reference });
      }
      if (/url\s*\(/i.test(value)) {
        const reference = fragmentUrlReference(value);
        if (!IRI_ATTRIBUTES.has(attributeName) || !reference) {
          failSvg(sourceName, `external non-fragment IRI in ${attribute.name}`);
        }
        references.push({ attribute: attributeName, target: reference });
      }
      if (attributeName === "id") {
        if (!value || /[\s#"'()<>]/.test(value)) {
          failSvg(sourceName, `invalid id ${value}`);
        }
        if (ids.has(value)) failSvg(sourceName, `duplicate id ${value}`);
        ids.add(value);
      }

      attributes.push([attributeName, value]);
    }

    attributes.sort(([left], [right]) => {
      const leftOrder = ATTRIBUTE_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = ATTRIBUTE_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    const serializedAttributes = attributes
      .map(
        ([attributeName, value]) =>
          ` ${attributeName}="${escapeXmlAttribute(value)}"`,
      )
      .join("");

    let serializedChildren = "";
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) {
        serializedChildren += serializeElement(child, false);
      } else if (child.nodeType === 3) {
        if (child.data.trim()) serializedChildren += escapeXmlText(child.data);
      } else if (child.nodeType !== 8) {
        failSvg(sourceName, `unsupported XML node inside ${name}`);
      }
    }

    if (OMITTED_ELEMENTS.has(name)) return "";
    if (!serializedChildren) return `<${name}${serializedAttributes}/>`;
    return `<${name}${serializedAttributes}>${serializedChildren}</${name}>`;
  }

  const serialized = serializeElement(root, true);
  for (const { attribute, target } of references) {
    if (!ids.has(target)) {
      failSvg(sourceName, `unresolved fragment IRI #${target} in ${attribute}`);
    }
  }
  return serialized;
}

const generatedIconPath = fileURLToPath(
  new URL("../src/icons/generated.ts", import.meta.url),
);

const officialIconEntries = [
  ["aws.acm", "acm.svg"],
  ["aws.alb", "elastic-load-balancing.svg"],
  ["aws.api-gateway", "api-gateway.svg"],
  ["aws.application-composer", "application-composer.svg"],
  ["aws.app-mesh", "app-mesh.svg"],
  ["aws.app-runner", "app-runner.svg"],
  ["aws.appflow", "appflow.svg"],
  ["aws.application-discovery", "application-discovery.svg"],
  ["aws.application-migration", "application-migration.svg"],
  ["aws.appstream", "appstream.svg"],
  ["aws.appsync", "appsync.svg"],
  ["aws.artifact", "artifact.svg"],
  ["aws.athena", "athena.svg"],
  ["aws.audit-manager", "audit-manager.svg"],
  ["aws.aurora", "aurora.svg"],
  ["aws.batch", "batch.svg"],
  ["aws.bedrock", "bedrock.svg"],
  ["aws.braket", "braket.svg"],
  ["aws.budgets", "budgets.svg"],
  ["aws.chime", "chime.svg"],
  ["aws.cloud-map", "cloud-map.svg"],
  ["aws.cloud9", "cloud9.svg"],
  ["aws.cloudendure", "cloudendure.svg"],
  ["aws.cloudformation", "cloudformation.svg"],
  ["aws.cloudfront", "cloudfront.svg"],
  ["aws.cloudtrail", "cloudtrail.svg"],
  ["aws.cloudwatch-alarms", "cloudwatch-alarms.svg"],
  ["aws.cloudwatch-logs", "cloudwatch-logs.svg"],
  ["aws.cloudwatch-metrics", "cloudwatch-metrics.svg"],
  ["aws.codeartifact", "codeartifact.svg"],
  ["aws.codebuild", "codebuild.svg"],
  ["aws.codecommit", "codecommit.svg"],
  ["aws.codedeploy", "codedeploy.svg"],
  ["aws.codeguru", "codeguru.svg"],
  ["aws.codepipeline", "codepipeline.svg"],
  ["aws.comprehend", "comprehend.svg"],
  ["aws.compute-optimizer", "compute-optimizer.svg"],
  ["aws.config", "config.svg"],
  ["aws.connect", "connect.svg"],
  ["aws.connect-customer-profiles", "connect-customer-profiles.svg"],
  ["aws.connect-voice-id", "connect-voice-id.svg"],
  ["aws.control-tower", "control-tower.svg"],
  ["aws.copilot", "copilot.svg"],
  ["aws.cost-explorer", "cost-explorer.svg"],
  ["aws.cost-usage-report", "cost-usage-report.svg"],
  ["aws.customer-gateway", "customer-gateway.svg"],
  ["aws.data-pipeline", "data-pipeline.svg"],
  ["aws.datasync", "datasync.svg"],
  ["aws.detective", "detective.svg"],
  ["aws.direct-connect", "direct-connect.svg"],
  ["aws.dms", "dms.svg"],
  ["aws.documentdb", "documentdb.svg"],
  ["aws.dynamodb", "dynamodb.svg"],
  ["aws.ebs", "ebs.svg"],
  ["aws.ec2", "ec2.svg"],
  ["aws.ecr", "ecr.svg"],
  ["aws.ecs", "ecs.svg"],
  ["aws.ecs-anywhere", "ecs-anywhere.svg"],
  ["aws.efs", "efs.svg"],
  ["aws.eks", "eks.svg"],
  ["aws.eks-addons", "eks-addons.svg"],
  ["aws.elastic-beanstalk", "elastic-beanstalk.svg"],
  ["aws.elastic-ip", "elastic-ip.svg"],
  ["aws.elasticache", "elasticache.svg"],
  ["aws.emr", "emr.svg"],
  ["aws.eventbridge", "eventbridge.svg"],
  ["aws.eventbridge-pipes", "eventbridge-pipes.svg"],
  ["aws.eventbridge-scheduler", "eventbridge-scheduler.svg"],
  ["aws.fargate", "fargate.svg"],
  ["aws.forecast", "forecast.svg"],
  ["aws.fsx-lustre", "fsx-lustre.svg"],
  ["aws.gamelift", "gamelift.svg"],
  ["aws.gamesparks", "gamesparks.svg"],
  ["aws.glacier", "glacier.svg"],
  ["aws.global-accelerator", "global-accelerator.svg"],
  ["aws.glue", "glue.svg"],
  ["aws.ground-station", "ground-station.svg"],
  ["aws.guardduty", "guardduty.svg"],
  ["aws.honeycode", "honeycode.svg"],
  ["aws.iam-role", "iam-role.svg"],
  ["aws.inspector", "inspector.svg"],
  ["aws.internet-gateway", "internet-gateway.svg"],
  ["aws.iot-core", "iot-core.svg"],
  ["aws.iot-events", "iot-events.svg"],
  ["aws.iot-greengrass", "iot-greengrass.svg"],
  ["aws.iot-sitewise", "iot-sitewise.svg"],
  ["aws.iot-twinmaker", "iot-twinmaker.svg"],
  ["aws.kendra", "kendra.svg"],
  ["aws.keyspaces", "keyspaces.svg"],
  ["aws.kinesis-streams", "kinesis-streams.svg"],
  ["aws.kinesis-video", "kinesis-video.svg"],
  ["aws.lambda", "lambda.svg"],
  ["aws.lex", "lex.svg"],
  ["aws.lightsail", "lightsail.svg"],
  ["aws.local-zones", "local-zones.svg"],
  ["aws.mainframe-modernization", "mainframe-modernization.svg"],
  ["aws.managed-blockchain", "managed-blockchain.svg"],
  ["aws.managed-grafana", "managed-grafana.svg"],
  ["aws.managed-prometheus", "managed-prometheus.svg"],
  ["aws.mediaconnect", "mediaconnect.svg"],
  ["aws.mediaconvert", "mediaconvert.svg"],
  ["aws.medialive", "medialive.svg"],
  ["aws.mediapackage", "mediapackage.svg"],
  ["aws.mediastore", "mediastore.svg"],
  ["aws.mediatailor", "mediatailor.svg"],
  ["aws.migration-evaluator", "migration-evaluator.svg"],
  ["aws.monitron", "monitron.svg"],
  ["aws.mq", "mq.svg"],
  ["aws.msk", "msk.svg"],
  ["aws.nat-gateway", "nat-gateway.svg"],
  ["aws.neptune", "neptune.svg"],
  ["aws.network-firewall", "network-firewall.svg"],
  ["aws.nlb", "elastic-load-balancing.svg"],
  ["aws.opensearch", "opensearch.svg"],
  ["aws.opsworks", "opsworks.svg"],
  ["aws.organizations", "organizations.svg"],
  ["aws.outposts", "outposts.svg"],
  ["aws.outposts-rack", "outposts-rack.svg"],
  ["aws.outposts-server", "outposts-server.svg"],
  ["aws.panorama", "panorama.svg"],
  ["aws.pinpoint", "pinpoint.svg"],
  ["aws.polly", "polly.svg"],
  ["aws.privatelink", "privatelink.svg"],
  ["aws.qldb", "qldb.svg"],
  ["aws.quicksight", "quicksight.svg"],
  ["aws.rds", "rds.svg"],
  ["aws.rds-proxy", "rds-proxy.svg"],
  ["aws.redshift", "redshift.svg"],
  ["aws.rekognition", "rekognition.svg"],
  ["aws.route-table", "route-table.svg"],
  ["aws.route53", "route53.svg"],
  ["aws.route53-resolver", "route53-resolver.svg"],
  ["aws.s3", "s3.svg"],
  ["aws.sagemaker", "sagemaker.svg"],
  ["aws.sam", "sam.svg"],
  ["aws.savings-plans", "savings-plans.svg"],
  ["aws.secrets-manager", "secrets-manager.svg"],
  ["aws.security-group", "security-group.svg"],
  ["aws.service-catalog", "service-catalog.svg"],
  ["aws.ses", "ses.svg"],
  ["aws.shield", "shield.svg"],
  ["aws.simpledb", "simpledb.svg"],
  ["aws.simspace-weaver", "simspace-weaver.svg"],
  ["aws.snowball", "snowball.svg"],
  ["aws.snowcone", "snowcone.svg"],
  ["aws.snowmobile", "snowmobile.svg"],
  ["aws.sns", "sns.svg"],
  ["aws.sqs", "sqs.svg"],
  ["aws.step-functions", "step-functions.svg"],
  ["aws.storage-gateway", "storage-gateway.svg"],
  ["aws.subnet", "subnet.svg"],
  ["aws.sumerian", "sumerian.svg"],
  ["aws.supply-chain", "supply-chain.svg"],
  ["aws.systems-manager", "systems-manager.svg"],
  ["aws.timestream", "timestream.svg"],
  ["aws.transcribe", "transcribe.svg"],
  ["aws.transfer-family", "transfer-family.svg"],
  ["aws.transit-gateway", "transit-gateway.svg"],
  ["aws.translate", "translate.svg"],
  ["aws.vpc", "vpc.svg"],
  ["aws.vpc-lattice", "vpc-lattice.svg"],
  ["aws.vpn-connection", "vpn-connection.svg"],
  ["aws.vpn-gateway", "vpn-gateway.svg"],
  ["aws.waf", "waf.svg"],
  ["aws.wavelength", "wavelength.svg"],
  ["aws.wickr", "wickr.svg"],
  ["aws.workdocs", "workdocs.svg"],
  ["aws.worklink", "worklink.svg"],
  ["aws.workmail", "workmail.svg"],
  ["aws.workspaces", "workspaces.svg"],
  ["aws.xray", "xray.svg"],
  ["aws.eventbridge-api-destinations", "eventbridge-api-destinations.svg"],
  ["aws.fsx-windows", "fsx-windows.svg"],
  ["aws.iot-analytics", "iot-analytics.svg"],
  ["aws.iot-roborunner", "iot-roborunner.svg"],
  ["aws.ivs", "ivs.svg"],
  ["aws.kinesis-analytics", "kinesis-analytics.svg"],
  ["aws.kinesis-firehose", "kinesis-firehose.svg"],
  ["aws.kms", "kms.svg"],
  ["aws.lambda-edge", "lambda-edge.svg"],
  ["aws.lambda-layers", "lambda-layers.svg"],
  ["aws.migration-hub", "migration-hub.svg"],
  ["aws.opsworks-cm", "opsworks-cm.svg"],
  ["aws.opsworks-stacks", "opsworks-stacks.svg"],
  ["aws.private-5g", "private-5g.svg"],
  ["aws.robomaker", "robomaker.svg"],
  ["aws.sms", "sms.svg"],
  ["aws.sns-mobile", "sns-mobile.svg"],
  ["aws.step-functions-express", "step-functions-express.svg"],
  ["aws.vpc-endpoint-gateway", "vpc-endpoint-gateway.svg"],
  ["aws.vpc-endpoint-interface", "vpc-endpoint-interface.svg"],
  ["aws.workspaces-web", "workspaces-web.svg"],
].map(([key, filename]) => ({
  key,
  sourcePath: fileURLToPath(
    new URL(`../assets/official/${filename}`, import.meta.url),
  ),
}));

export function sanitizeAwsSvg(svg, sourceName) {
  const document = parseSvgDocument(svg, sourceName);
  const root = document.documentElement;
  const sanitizedSvg = serializeSafeSvg(document, sourceName);
  const viewBox = root?.getAttribute("viewBox");
  if (!viewBox) failSvg(sourceName, "missing viewBox");
  validateViewBox(viewBox, sourceName);
  return { viewBox, svg: sanitizedSvg };
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function generateIconModule(entries) {
  const icons = await Promise.all(
    [...entries]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map(async ({ key, sourcePath }) => {
        try {
          const source = await readFile(sourcePath, "utf8");
          const sanitized = sanitizeAwsSvg(source, sourcePath);

          return {
            key,
            viewBox: sanitized.viewBox,
            checksum: checksum(sanitized.svg),
            svg: sanitized.svg,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          throw new Error(`${key} (${sourcePath}): ${message}`, {
            cause: error,
          });
        }
      }),
  );

  const record = Object.fromEntries(icons.map((icon) => [icon.key, icon]));
  const manifestChecksum = checksum(
    JSON.stringify(
      icons
        .map(({ key, checksum: iconChecksum }) => [key, iconChecksum])
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
    ),
  );
  return `// Generated by scripts/import-official-icons.mjs. Do not edit manually.\n\n// biome-ignore format: generated TypeScript literals retain deterministic JSON serialization.\nexport const AWS_GENERATED_ICONS = ${JSON.stringify(record, null, 2)} as const;\n\nexport const AWS_GENERATED_ICON_MANIFEST_CHECKSUM =\n  "${manifestChecksum}" as const;\n`;
}

async function main() {
  const generated = await generateIconModule(officialIconEntries);

  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = await readFile(generatedIconPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (current !== generated) {
      throw new Error(
        "generated AWS icon module is out of date; run pnpm icons:generate",
      );
    }
    return;
  }

  await writeFile(generatedIconPath, generated);
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
