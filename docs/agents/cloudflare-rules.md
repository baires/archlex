# Cloudflare rule contract (CF17)

Cloudflare catalog recognition and artwork do not establish runtime correctness.
The initial selective rule uses only resource identity and explicit scope membership.

## Represented containment

Implementation: [#100](https://github.com/baires/archlex/issues/100).

- Facts: node provider, recognized service kind, node span, and scope childrenNodeIds.
- Trigger: a recognized Cloudflare node belongs to any region, VPC, subnet, cluster,
  or namespace. Check every ancestor, including ancestors outside an account.
  Emit once per node, regardless of how many forbidden scopes contain it.
- Code: `CLOUDFLARE-CONTAINMENT-001`.
- Remediation: move the managed resource to document root or a logical account;
  keep origin workloads in their native scopes and connect them with edges.
- Modes: warning in normal, error in strict, absent in off.
- Valid: root, account, and presentation-only groups. Foreign providers and
  unknown services are outside this rule's responsibility.

All 92 included catalog resources share account/root placement. Managed Tunnel
and origin-side cloudflared are distinct identities: represent cloudflared as a
native workload, such as a Kubernetes Deployment inside its namespace.

## Limits

No rule requires a DNS edge, a Worker, a WAF hop, a connector, two origins, or a
particular relationship direction. Partial diagrams and capability associations
are valid. The graph contains no DNS records, security policy configuration,
selectors, protocol settings, origin pools, monitors, health, or reachability.
Consequently no operational networking rule is approved in this contract.

DNS labels describe name selection; request labels describe intended forwarding.
WAF/Access use capability edges. Tunnel establishment and request flow use
separate, opposite arrows. Origin steering labels express preference and fallback
intent without certifying failover. Invalid fixture variants test containment in
normal/strict/off; parser and unresolved-resource errors remain core diagnostics.

## Execution barrier

CF18–CF20 require catalog completion #99 and rule implementation #100. CF21
requires #99 and the core exports. CF22, CF24 and CF25 require #100 as well as
the example, browser, and import-boundary evidence. No additional rule children
are required for this contract. Keep the local plan/spec excluded from commits.
