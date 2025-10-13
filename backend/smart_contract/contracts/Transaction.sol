// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.24;

/// @title AuthCert Transaction Registry (minimal & gas-efficient)
/// @notice Stores on-chain proof of issuance by hashing the PDF (bytes32) and linking to student & issuer
contract Transaction {
    // ========= Errors =========
    error InvalidStudent();
    error AlreadyIssued();
    error NotFound();
    error AlreadyRevoked();
    error NotIssued();

    // ========= Types =========
    struct Record {
        address issuer;    // msg.sender who issued
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

    // ========= Write =========
    /// @notice Register issuance of a certificate hash for a student
    /// @param pdfHash SHA-256 hash of the PDF (bytes32)
    /// @param student Student wallet address
    function issue(bytes32 pdfHash, address student) external {
        if (student == address(0)) revert InvalidStudent();
        if (records[pdfHash].issuedAt != 0) revert AlreadyIssued();

        uint64 nowTs = uint64(block.timestamp);
        records[pdfHash] = Record({
            issuer: msg.sender,
            student: student,
            issuedAt: nowTs,
            revoked: false,
            revokedAt: 0,
            reason: ""
        });

        emit CertificateIssued(pdfHash, student, msg.sender, nowTs);
    }

    /// @notice Revoke a previously issued certificate
    /// @param pdfHash SHA-256 hash of the PDF (bytes32)
    /// @param reason Reason for revocation
    function revoke(bytes32 pdfHash, string calldata reason) external {
        Record storage record = records[pdfHash];
        if (record.issuedAt == 0) revert NotIssued();
        if (record.revoked) revert AlreadyRevoked();
        
        // Seul l'émetteur original peut révoquer
        if (record.issuer != msg.sender) revert InvalidStudent();

        uint64 nowTs = uint64(block.timestamp);
        record.revoked = true;
        record.revokedAt = nowTs;
        record.reason = reason;

        emit CertificateRevoked(pdfHash, msg.sender, nowTs, reason);
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