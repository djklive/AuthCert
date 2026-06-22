const { ethers } = require('ethers');

// ABIs du contrat de certificats (regroupés ici pour éviter la duplication).
// Modèle relayer : issue/revoke incluent la signature de l'établissement (issuer).
const ABIS = {
  issue: [
    'function issue(bytes32 pdfHash, address student, address issuer, bytes signature) external',
    'function isIssued(bytes32 pdfHash) external view returns (bool)',
    'event CertificateIssued(bytes32 indexed pdfHash, address indexed student, address indexed issuer, uint64 issuedAt)'
  ],
  verify: [
    'function isIssued(bytes32 pdfHash) external view returns (bool)',
    'function getRecord(bytes32 pdfHash) external view returns (address issuer, address student, uint256 issuedAt)'
  ],
  publicVerify: [
    'function isIssued(bytes32 pdfHash) external view returns (bool)',
    'function isRevoked(bytes32 pdfHash) external view returns (bool)',
    'function getRecord(bytes32 pdfHash) external view returns (address issuer, address student, uint256 issuedAt)',
    'function getRevocationInfo(bytes32 pdfHash) external view returns (bool revoked, uint256 revokedAt, string memory reason)'
  ],
  revoke: ['function revoke(bytes32 pdfHash, string reason, bytes signature) external']
};

/**
 * Retourne la configuration blockchain depuis l'environnement.
 */
function getConfig() {
  return {
    rpcUrl: process.env.CHAIN_RPC_URL,
    contractAddress: process.env.CERT_CONTRACT_ADDRESS
  };
}

/**
 * Crée un provider JSON-RPC.
 * @param {string} [rpcUrl] - URL RPC (défaut: CHAIN_RPC_URL).
 */
function getProvider(rpcUrl) {
  return new ethers.JsonRpcProvider(rpcUrl || process.env.CHAIN_RPC_URL);
}

/**
 * Crée une instance de contrat.
 */
function getContract(address, abi, signerOrProvider) {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Normalise un hash PDF en bytes32 (préfixe 0x).
 */
function formatPdfHash(pdfHash) {
  return pdfHash.startsWith('0x') ? pdfHash : '0x' + pdfHash;
}

/**
 * Récupère le solde (en ether/MATIC) d'une adresse.
 */
async function getBalance(address, rpcUrl) {
  const provider = getProvider(rpcUrl);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

// ===============================================
//                MODÈLE RELAYER
// ===============================================

/**
 * Wallet relayer (trésorerie de la plateforme) qui paie le gas.
 */
function getRelayer() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error('RELAYER_PRIVATE_KEY manquant dans les variables d\'environnement');
  }
  return new ethers.Wallet(pk, getProvider());
}

/**
 * Dérive l'adresse publique à partir d'une clé privée.
 */
function deriveAddress(privateKey) {
  return new ethers.Wallet(privateKey).address;
}

/**
 * Signe (hors-chaîne, gratuit) l'autorisation d'émission par l'établissement.
 * @returns {Promise<{signature: string, issuer: string}>}
 */
async function signCertificate(pdfHash, studentAddress, establishmentPrivateKey) {
  const hash = formatPdfHash(pdfHash);
  const digest = ethers.solidityPackedKeccak256(['bytes32', 'address'], [hash, studentAddress]);
  const wallet = new ethers.Wallet(establishmentPrivateKey);
  const signature = await wallet.signMessage(ethers.getBytes(digest));
  return { signature, issuer: wallet.address };
}

/**
 * Signe (hors-chaîne, gratuit) l'autorisation de révocation par l'établissement.
 * @returns {Promise<{signature: string, issuer: string}>}
 */
async function signRevocation(pdfHash, establishmentPrivateKey) {
  const hash = formatPdfHash(pdfHash);
  const digest = ethers.solidityPackedKeccak256(['string', 'bytes32'], ['REVOKE', hash]);
  const wallet = new ethers.Wallet(establishmentPrivateKey);
  const signature = await wallet.signMessage(ethers.getBytes(digest));
  return { signature, issuer: wallet.address };
}

/**
 * Vérifie si un hash est déjà émis on-chain (lecture seule).
 */
async function isIssued(contractAddress, pdfHash) {
  const contract = new ethers.Contract(contractAddress, ABIS.verify, getProvider());
  return contract.isIssued(formatPdfHash(pdfHash));
}

/**
 * Émet le certificat on-chain via le relayer (le relayer paie le gas).
 * @returns {Promise<string>} hash de la transaction
 */
async function issueViaRelayer({ contractAddress, pdfHash, student, issuer, signature, timeoutMs = 30000 }) {
  const relayer = getRelayer();
  const contract = new ethers.Contract(contractAddress, ABIS.issue, relayer);
  const hash = formatPdfHash(pdfHash);

  const tx = await Promise.race([
    contract.issue(hash, student, issuer, signature),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de la transaction')), timeoutMs))
  ]);
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

/**
 * Révoque le certificat on-chain via le relayer (le relayer paie le gas).
 * @returns {Promise<string>} hash de la transaction
 */
async function revokeViaRelayer({ contractAddress, pdfHash, reason, signature, timeoutMs = 30000 }) {
  const relayer = getRelayer();
  const contract = new ethers.Contract(contractAddress, ABIS.revoke, relayer);
  const hash = formatPdfHash(pdfHash);

  const tx = await Promise.race([
    contract.revoke(hash, reason, signature),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de la transaction')), timeoutMs))
  ]);
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

/**
 * Infos du wallet relayer pour le dashboard admin (adresse + solde).
 */
async function getRelayerInfo() {
  const relayer = getRelayer();
  let balance = '0';
  let balanceError = null;
  try {
    const balanceWei = await getProvider().getBalance(relayer.address);
    balance = ethers.formatEther(balanceWei);
  } catch (err) {
    balanceError = err.message;
  }
  return {
    address: relayer.address,
    balance: parseFloat(balance).toFixed(4),
    balanceError,
    network: 'Polygon Amoy Testnet',
    currency: 'MATIC',
    explorerUrl: `https://amoy.polygonscan.com/address/${relayer.address}`,
    faucetUrl: 'https://faucet.polygon.technology/'
  };
}

module.exports = {
  ABIS,
  getConfig,
  getProvider,
  getContract,
  formatPdfHash,
  getBalance,
  getRelayer,
  deriveAddress,
  signCertificate,
  signRevocation,
  isIssued,
  issueViaRelayer,
  revokeViaRelayer,
  getRelayerInfo
};
