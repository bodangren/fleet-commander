# Encrypted Storage — Implementation Plan

## Phase 1: Encryption Utilities

- [ ] Implement `encrypt(plaintext, key)` using AES-256-GCM (Node/Bun crypto)
- [ ] Implement `decrypt(ciphertext, key, iv, authTag)` counterpart
- [ ] Key derivation: PBKDF2 with configurable iterations and salt
- [ ] Encryption metadata structure: { ciphertext, iv, authTag, keyVersion }
- [ ] Constant-time auth tag comparison to prevent timing attacks
- [ ] Unit tests: encrypt/decrypt roundtrip, tampered ciphertext detection, wrong key rejection
- [ ] Benchmark: ensure <1ms per field for typical payloads (<1KB)

## Phase 2: Field-Level Encryption

- [ ] Define `@encrypted` field annotation in Convex schema helpers
- [ ] Implement transparent encryption layer: encrypt on mutation write, decrypt on query read
- [ ] Identify sensitive fields across schema: projects.envVars, agents.prompts, harnesses.credentials
- [ ] Write migration function to encrypt existing plaintext fields in-place
- [ ] Migration safety: backup check, batched processing, progress logging
- [ ] Update all read paths to decrypt transparently
- [ ] Write integration tests: create record with encrypted field, verify stored as ciphertext, read back as plaintext

## Phase 3: Keychain Integration and Key Rotation

- [ ] Install keytar (or node-keychain equivalent) for cross-platform keychain access
- [ ] Implement `getMasterKey()`: read from keychain, fallback to encrypted file
- [ ] Implement `setMasterKey()`: store in keychain on first setup
- [ ] Key rotation: generate new key, re-encrypt all fields with new key version
- [ ] Batched rotation job: process N fields at a time, log progress
- [ ] Multi-version decrypt: try current key, fallback to previous versions
- [ ] Implement encrypted backup export: serialize data, encrypt with backup password
- [ ] Implement backup import: decrypt archive, restore data
- [ ] End-to-end test: rotate key, verify all fields still decrypt correctly
