// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title AuthCert Transaction Registry (relayer / meta-transactions)
/// @notice Stores on-chain proof of issuance by hashing the PDF (bytes32) and linking to student & issuer.
/// @dev L'etablissement (issuer) signe hors-chaine ; un relayer envoie la transaction et paie le gas.
///      Le contrat verifie via ECDSA que la signature provient bien de l'issuer declare.
contract Transaction {
    using ECDSA for bytes32;

    // ========= Errors =========
    error InvalidStudent();
    error InvalidIssuer();
    error InvalidSignature();
    error AlreadyIssued();
    error NotFound();
    error AlreadyRevoked();
    error NotIssued();

    // ========= Types =========
    struct Record {
        address issuer;    // etablissement qui a signe l'emission
        address student;   // owner/recipient of the certificate
        uint64 issuedAt;   // unix timestamp (64-bit sufficient)
        bool revoked;      // revocation status
        uint64 revokedAt;  // revocation timestamp
        string reason;     // revocation reason
    }

    // ========= Storage =========
    mapping(bytes32 => Record) private records; // pdfHash => Record

    // ========= Events =========
    event CertificateIssued(bytes32 indexed pdfHash, address indexed student, address indexed issuer, uint64 issuedAt);
    event CertificateRevoked(bytes32 indexed pdfHash, address indexed issuer, uint64 revokedAt, string reason);

    // ========= Signature helpers =========
    /// @notice Hash signe par l'etablissement pour autoriser une emission.
    function issuanceDigest(bytes32 pdfHash, address student) public pure returns (bytes32) {
        bytes32 raw = keccak256(abi.encodePacked(pdfHash, student));
        return MessageHashUtils.toEthSignedMessageHash(raw);
    }

    /// @notice Hash signe par l'etablissement pour autoriser une revocation.
    function revocationDigest(bytes32 pdfHash) public pure returns (bytes32) {
        bytes32 raw = keccak256(abi.encodePacked("REVOKE", pdfHash));
        return MessageHashUtils.toEthSignedMessageHash(raw);
    }

    // ========= Write =========
    /// @notice Register issuance of a certificate hash for a student (relayed meta-transaction).
    /// @param pdfHash SHA-256 hash of the PDF (bytes32)
    /// @param student Student wallet address
    /// @param issuer Adresse publique de l'etablissement emetteur (signataire)
    /// @param signature Signature ECDSA de l'issuer sur issuanceDigest(pdfHash, student)
    function issue(bytes32 pdfHash, address student, address issuer, bytes calldata signature) external {
        if (student == address(0)) revert InvalidStudent();
        if (issuer == address(0)) revert InvalidIssuer();
        if (records[pdfHash].issuedAt != 0) revert AlreadyIssued();

        // Verifier que la signature provient bien de l'issuer declare
        address recovered = ECDSA.recover(issuanceDigest(pdfHash, student), signature);
        if (recovered != issuer) revert InvalidSignature();

        uint64 nowTs = uint64(block.timestamp);
        records[pdfHash] = Record({
            issuer: issuer,
            student: student,
            issuedAt: nowTs,
            revoked: false,
            revokedAt: 0,
            reason: ""
        });

        emit CertificateIssued(pdfHash, student, issuer, nowTs);
    }

    /// @notice Revoke a previously issued certificate (relayed meta-transaction).
    /// @param pdfHash SHA-256 hash of the PDF (bytes32)
    /// @param reason Reason for revocation
    /// @param signature Signature ECDSA de l'issuer original sur revocationDigest(pdfHash)
    function revoke(bytes32 pdfHash, string calldata reason, bytes calldata signature) external {
        Record storage record = records[pdfHash];
        if (record.issuedAt == 0) revert NotIssued();
        if (record.revoked) revert AlreadyRevoked();

        // Seul l'emetteur original (via sa signature) peut revoquer
        address recovered = ECDSA.recover(revocationDigest(pdfHash), signature);
        if (recovered != record.issuer) revert InvalidSignature();

        uint64 nowTs = uint64(block.timestamp);
        record.revoked = true;
        record.revokedAt = nowTs;
        record.reason = reason;

        emit CertificateRevoked(pdfHash, record.issuer, nowTs, reason);
    }

    // ========= Read =========
    function isIssued(bytes32 pdfHash) external view returns (bool) {
        return records[pdfHash].issuedAt != 0;
    }

    function isRevoked(bytes32 pdfHash) external view returns (bool) {
        return records[pdfHash].revoked;
    }

    function getRecord(bytes32 pdfHash) external view returns (address issuer, address student, uint256 issuedAt) {
        Record memory r = records[pdfHash];
        if (r.issuedAt == 0) revert NotFound();
        return (r.issuer, r.student, r.issuedAt);
    }

    function getRevocationInfo(bytes32 pdfHash) external view returns (bool revoked, uint256 revokedAt, string memory reason) {
        Record memory r = records[pdfHash];
        if (r.issuedAt == 0) revert NotFound();
        return (r.revoked, r.revokedAt, r.reason);
    }
}
