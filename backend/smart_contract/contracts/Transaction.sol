// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.24;

/// @title AuthCert Transaction Registry (minimal & gas-efficient)
/// @notice Stores on-chain proof of issuance by hashing the PDF (bytes32) and linking to student & issuer
contract Transaction {
    // ========= Errors =========
    error InvalidStudent();
    error AlreadyIssued();
    error NotFound();

    // ========= Types =========
    struct Record {
        address issuer;    // msg.sender who issued
        address student;   // owner/recipient of the certificate
        uint64 issuedAt;   // unix timestamp (64-bit sufficient)
    }

    // ========= Storage =========
    mapping(bytes32 => Record) private records; // pdfHash => Record

    // ========= Events =========
    event CertificateIssued(bytes32 indexed pdfHash, address indexed student, address indexed issuer, uint64 issuedAt);

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
            issuedAt: nowTs
        });

        emit CertificateIssued(pdfHash, student, msg.sender, nowTs);
    }

    // ========= Read =========
    function isIssued(bytes32 pdfHash) external view returns (bool) {
        return records[pdfHash].issuedAt != 0;
    }

    function getRecord(bytes32 pdfHash) external view returns (address issuer, address student, uint256 issuedAt) {
        Record memory r = records[pdfHash];
        if (r.issuedAt == 0) revert NotFound();
        return (r.issuer, r.student, r.issuedAt);
    }
}