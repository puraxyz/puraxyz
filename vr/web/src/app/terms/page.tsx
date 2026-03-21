'use client'

import React from "react";
import { Container, Title, Text, Anchor, List, Divider, Stack } from "@mantine/core";

export default function TermsOfService() {
    const lastUpdated = "2026-03-06"
    const companyName = "vr.dev"
    const supportEmail = "contact@vr.dev"
    const dmcaEmail = "contact@vr.dev"
    return (
        <Container size="md" py="xl">
            <Title order={2} mb="sm">
                Terms of Service
            </Title>
            <Text size="sm" c="dimmed" mb="sm">
                Last updated: {lastUpdated}
            </Text>
            <Divider my="md" />

            <Section title="1. Overview">
                <p>
                    These Terms of Service govern your access to and use of {companyName} (the {'"'}Service{'"'}),
                    including the website, API, Python SDK, verifier registry, and documentation.
                    By using the Service, you agree to these Terms and our Privacy Policy.
                </p>
                <p>
                    {companyName} provides verifiable reward functions for AI agent evaluation and training.
                    The Service includes a hosted verification API, an open-source Python SDK, and a
                    public registry of verifier and skill specifications.
                </p>
            </Section>

            <Section title="2. Eligibility and Accounts">
                <ul>
                    <li>You must be at least 16 years old (or the age of digital consent in your country).</li>
                    <li>You are responsible for your account, API keys, and all activity under them.</li>
                    <li>Keep your API keys secure. Do not share them publicly or embed them in client-side code.</li>
                    <li>Provide accurate information and keep it up to date. We may refuse or reclaim usernames.</li>
                </ul>
            </Section>

            <Section title="3. API Keys and Access">
                <p>
                    API keys grant access to the hosted verification API. You are responsible for all usage
                    associated with your keys. If you believe a key has been compromised, revoke it immediately
                    via the dashboard.
                </p>
                <ul>
                    <li>Do not share API keys with unauthorized parties.</li>
                    <li>Do not use API keys to circumvent rate limits (e.g., rotating keys to exceed quotas).</li>
                    <li>We may revoke keys that violate these Terms or exhibit abusive patterns.</li>
                    <li>Free-tier usage is subject to rate limits. Exceeding limits may result in throttling or suspension.</li>
                </ul>
            </Section>

            <Section title="4. Contributed Content and Licenses">
                <p>
                    You retain ownership of content you contribute to the Service, including verifier
                    implementations, skill definitions, fixture sets, and documentation.
                </p>
                <p>
                    By contributing verifiers or skills to the public registry, you grant us a worldwide,
                    non-exclusive, royalty-free license to host, store, reproduce, modify, publicly display,
                    and distribute your Contributions as part of the Service. This includes making them
                    available to other users via the API, SDK, and registry.
                </p>
                <p>
                    You represent and warrant you have all rights necessary and that your Contributions
                    do not infringe others{"'"}  rights.
                </p>
            </Section>

            <Section title="5. SDK and Open Source">
                <p>
                    The {companyName} Python SDK is distributed under its own open-source license. Your use of the
                    SDK is governed by that license in addition to these Terms. The hosted API is a separate
                    service subject to these Terms regardless of whether you use the SDK to access it.
                </p>
            </Section>

            <Section title="6. Verification Data and Evidence">
                <p>
                    When you use the verification API, we may store verification results, evidence artifacts,
                    and usage metadata to operate the Service. This includes:
                </p>
                <ul>
                    <li>Verification inputs (completions, ground truth) for the duration of the API request.</li>
                    <li>Verification results and evidence artifacts, retained according to your plan{"'"}s retention period.</li>
                    <li>Usage metrics (request counts, latency) for billing and service improvement.</li>
                </ul>
                <p>
                    Evidence artifacts are stored with content-addressed hashing (SHA-256) for tamper-evidence.
                    We do not use your verification inputs to train models or share them with third parties
                    unless required by law.
                </p>
            </Section>

            <Section title="7. Acceptable Use">
                <ul>
                    <li>Do not violate laws or regulations.</li>
                    <li>Do not use the Service to develop, train, or evaluate AI systems intended to cause harm.</li>
                    <li>Do not submit malicious inputs designed to exploit verifiers, corrupt evidence, or manipulate reward signals.</li>
                    <li>Do not attempt to reverse-engineer, extract, or replicate proprietary verifier implementations through API probing.</li>
                    <li>Do not use the Service to generate misleading benchmark results or fabricate evaluation evidence.</li>
                    <li>Do not scrape or harvest data without our consent (standard search indexing via robots.txt is allowed).</li>
                    <li>Do not impersonate others or misrepresent affiliations.</li>
                    <li>Do not circumvent security features, rate limits, or access controls.</li>
                </ul>
            </Section>

            <Section title="8. Agent and Automated Access">
                <p>
                    The Service is designed for both human and AI agent access. Automated systems (including
                    AI agents, CI pipelines, and training loops) may use the API subject to the same rate
                    limits and acceptable use policies as human users.
                </p>
                <ul>
                    <li>Automated systems must authenticate with valid API keys.</li>
                    <li>You are responsible for the actions of any automated system using your API keys.</li>
                    <li>We may apply additional rate limits to automated access patterns to protect service stability.</li>
                </ul>
            </Section>

            <Section title="9. Cookies and Similar Technologies">
                <p>
                    We use cookies and similar technologies to operate the Service, remember preferences, measure
                    performance, and improve user experience. Some cookies are essential; others are for analytics.
                    By using the Service, you consent to our cookie use as described here and in our
                    Privacy Policy. Where required by law, we will present a cookie banner and obtain consent for
                    non-essential cookies.
                </p>
            </Section>

            <Section title="10. Privacy">
                <p>
                    By using the Service, you agree to our processing of your information to provide and improve the Service.
                </p>
            </Section>

            <Section title="11. Third-Party Links and Integrations">
                <p>
                    The Service integrates with third-party tools and frameworks (including training libraries,
                    agent frameworks, and MCP-compatible systems). We are not responsible for third-party content,
                    policies, or practices. Use of third-party integrations is at your own risk.
                </p>
            </Section>

            <Section title="12. Paid Features and Billing">
                <p>
                    Prices, features, and terms for paid tiers will be presented at purchase and may change with notice
                    where required. Subscriptions renew unless canceled as instructed. Usage-based charges (per-verification
                    overages) are billed at the rates displayed on your plan page. Taxes may apply.
                </p>
            </Section>

            <Section title="13. Intellectual Property">
                <p>
                    The Service, including trademarks, logos, website code, and proprietary API infrastructure, is owned
                    by us or our licensors and protected by law. Verifiers and skills in the public registry are licensed
                    under their respective open-source licenses. Except for those licenses and the limited license
                    to use the Service, no additional rights are granted.
                </p>
            </Section>

            <Section title="14. DMCA/Notice and Takedown">
                <p>
                    If you believe content infringes your copyright,{" "}
                    <Anchor href={`mailto:${dmcaEmail}`}>email us</Anchor> including:
                </p>
                <List size="sm">
                    <List.Item>Identification of the copyrighted work and the allegedly infringing material (URL).</List.Item>
                    <List.Item>Your contact info and a statement under penalty of perjury of your good-faith belief.</List.Item>
                    <List.Item>A statement you are authorized to act, and an electronic signature.</List.Item>
                </List>
            </Section>

            <Section title="15. Termination">
                <p>
                    You may stop using the Service and revoke your API keys at any time. We may suspend or terminate
                    your account if you violate these Terms or if necessary to protect the Service or users.
                    Upon termination, your API keys will be revoked and evidence artifacts will be deleted
                    according to retention policies. Certain provisions survive termination.
                </p>
            </Section>

            <Section title="16. Disclaimers">
                <p>
                    The Service is provided {'"'}as is{'"'} and {'"'}as available{'"'} without warranties of any kind, express or implied.
                    We do not warrant that verification results are accurate, complete, or suitable for any particular
                    purpose. Verification results are tools for evaluation, not guarantees of agent behavior.
                    You are responsible for how you use verification outputs in training, evaluation, and deployment.
                </p>
            </Section>

            <Section title="17. Limitation of Liability">
                <p>
                    To the maximum extent permitted by law, we and our affiliates are not liable for indirect, incidental,
                    special, consequential, exemplary, or punitive damages, or loss of profits, data, or goodwill. This
                    includes damages arising from reliance on verification results in AI training or deployment.
                    Our total liability will not exceed the greater of (a) amounts you paid to us in the 12 months
                    before the claim, or (b) $100.
                </p>
            </Section>

            <Section title="18. Indemnification">
                <p>
                    You agree to indemnify and hold us harmless from any claims, damages, losses, and expenses (including
                    reasonable attorneys{"'"}  fees) arising from your use of the Service, your Contributions, AI systems
                    trained or evaluated using the Service, or your violation of these Terms or law.
                </p>
            </Section>

            <Section title="19. Changes to the Service or Terms">
                <p>
                    We may modify the Service and these Terms. We will post updates with a revised date. Continued
                    use after changes means you accept the updated Terms.
                </p>
            </Section>

            <Section title="20. Contact">
                <p>
                    Questions? <Anchor href={`mailto:${supportEmail}`}>Email us</Anchor>.
                </p>
            </Section>
        </Container>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Stack component="section" gap="xs" mt="lg">
            <Title order={4}>
                {title}
            </Title>
            <Text component="div" size="sm" style={{ "& p": { marginBottom: 12 }, "& ul": { paddingLeft: 24, marginBottom: 12 } }}>
                {children}
            </Text>
        </Stack>
    );
}
