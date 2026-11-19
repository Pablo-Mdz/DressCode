# Security Policy

## Reporting a vulnerability

If you find a security issue in DressCode (an auth bypass, a Firestore/Storage rule that leaks another user's data, an XSS, a way to run up someone else's Anthropic bill, etc.), please **don't open a public issue**.

Instead, use GitHub's private reporting for this repo:

**[Report a vulnerability](https://github.com/Pablo-Mdz/DressCode/security/advisories/new)** (Security tab → Report a vulnerability)

If that's unavailable for some reason, email **pablocigoy@gmail.com** with "DressCode security" in the subject.

Please include:
- what the issue is and why it matters (what an attacker could do with it);
- steps to reproduce, or a proof of concept;
- which part it's in (the client app, a Cloud Function, the Firestore/Storage rules).

## What to expect

This is a personal project maintained by one person, not a company with an SLA — but security reports get priority. I'll acknowledge the report, let you know if I need more information, and credit you (if you'd like) once a fix ships.

## Scope

This policy covers the code in this repository: the React app, the Cloud Functions, and the Firestore/Storage rules. It does not cover:
- a self-hosted instance's own Firebase/Netlify configuration (that's the operator's responsibility — e.g. forgetting to set a daily AI quota, or not enabling App Check);
- the third-party services DressCode talks to (Firebase, Anthropic's Claude API, Netlify, Open-Meteo, IMG.LY) — please report issues in those directly to their maintainers.
