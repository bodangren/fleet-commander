# Encrypted Storage

## Overview

Field-level encryption for sensitive data at rest, OS keychain integration for key management, encrypted backup export, and key rotation support.

## Functional Requirements

1. **Encryption Utilities**
   - AES-256-GCM encryption/decryption helpers
   - Key derivation from master key using PBKDF2 or Argon2
   - Encryption metadata: IV, auth tag, key version stored alongside ciphertext
   - Constant-time comparison for auth tag verification

2. **Field-Level Encryption**
   - Encrypt sensitive fields on write: environment variables, API keys, agent prompts with secrets
   - Decrypt transparently on read within authorized context
   - Schema annotation: mark fields as `@encrypted` in Convex schema
   - Existing data migration: encrypt plaintext fields in-place

3. **OS Keychain Integration**
   - Store master encryption key in OS keychain (macOS Keychain, Linux Secret Service, Windows Credential Store)
   - Use `keytar` or equivalent library for cross-platform keychain access
   - Fallback: encrypted file-based key storage if keychain unavailable
   - Key never stored in Convex or environment variables

4. **Key Rotation**
   - Rotate master key: re-encrypt all fields with new key
   - Support multiple key versions: decrypt with old key, encrypt with new
   - Background rotation job: process fields in batches to avoid blocking
   - Rotation audit: log key version changes

5. **Encrypted Backup Export**
   - Export project data as encrypted archive
   - Backup password separate from master key
   - Import: decrypt archive with backup password

## Data Sources

- `projects` — envVars (encrypted fields)
- `agents` — prompts with secrets
- `harnesses` — credentials
- `runContracts` — sensitive configuration

## Acceptance Criteria

- [ ] Sensitive fields encrypted at rest in Convex
- [ ] Decryption transparent for authorized reads
- [ ] Master key stored in OS keychain, not in code or env
- [ ] Key rotation re-encrypts all fields without data loss
- [ ] Encrypted backup export/import functional
- [ ] Migration encrypts existing plaintext fields
- [ ] Performance: encryption/decryption adds <10ms per field

## Out of Scope

- End-to-end encryption (client-side encryption)
- Hardware security module (HSM) integration
- Encrypted search (homomorphic encryption)
- Certificate-based mutual TLS
