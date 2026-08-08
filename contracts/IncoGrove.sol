// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";

/// @title Inco Grove
/// @notice Private RPG state on Inco Lightning (Base Sepolia).
/// @dev Inventory, XP, and combat stats are euint256 handles.
///      Only the player EOA (and their registered session key) may decrypt.
///      Session keys call collect() without the main wallet after setSessionKey.
contract IncoGrove {
    using e for *;

    uint8 public constant CRYSTAL_COUNT = 12;
    uint256 public constant DUST_PER_CRYSTAL = 5;
    uint256 public constant XP_PER_CRYSTAL = 10;
    uint256 public constant QUEST_DUST_TARGET = 20;

    // ── Session keys (one-time main-wallet tx, then session signs collects) ──
    mapping(address => address) public sessionOf; // player => session
    mapping(address => address) public playerOf; // session => player
    mapping(address => uint64) public sessionExpiry; // session => expiry

    // ── Per-player encrypted state ──────────────────────────────────────────
    mapping(address => euint256) internal crystalDust;
    mapping(address => euint256) internal potions;
    mapping(address => euint256) internal mapPieces;
    mapping(address => euint256) internal xp;
    mapping(address => euint256) internal level;
    mapping(address => euint256) internal hp;
    mapping(address => euint256) internal atk;
    mapping(address => euint256) internal defStat;
    mapping(address => euint256) internal luck;
    /// @notice Encrypted dust progress toward the active quest (target 20).
    mapping(address => euint256) internal questDust;
    mapping(address => bool) public registered;

    // Per-player crystal pickup (instanced map — each player has their own crystals)
    mapping(address => mapping(uint8 => bool)) public collected;

    event Registered(address indexed player);
    event SessionKeySet(address indexed player, address indexed session, uint64 expiresAt);
    event CrystalCollected(address indexed player, uint8 indexed crystalId, address indexed caller);

    // ─────────────────────────────────────────────────────────────────────────
    // Player resolution
    // ─────────────────────────────────────────────────────────────────────────

    function _player() internal view returns (address player) {
        address mapped = playerOf[msg.sender];
        if (mapped != address(0)) {
            require(block.timestamp <= sessionExpiry[msg.sender], "session expired");
            return mapped;
        }
        return msg.sender;
    }

    /// @notice Grant permanent contract + player (+ session) access to a handle.
    function _allow(euint256 h, address player) internal {
        h.allowThis();
        h.allow(player);
        address session = sessionOf[player];
        if (session != address(0) && block.timestamp <= sessionExpiry[session]) {
            h.allow(session);
        }
    }

    function _add(euint256 cur, uint256 amount, address player) internal returns (euint256 next) {
        // Zero handle → treat as 0
        if (euint256.unwrap(cur) == bytes32(0)) {
            next = e.asEuint256(amount);
        } else {
            next = e.add(cur, e.asEuint256(amount));
        }
        _allow(next, player);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Registration & session
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice One-time init of encrypted stats/inventory for the caller.
    function register() external {
        address player = msg.sender;
        require(!registered[player], "already registered");
        _initPlayer(player);
        emit Registered(player);
    }

    function _initPlayer(address player) internal {
        registered[player] = true;

        crystalDust[player] = e.asEuint256(0);
        potions[player] = e.asEuint256(0);
        mapPieces[player] = e.asEuint256(0);
        xp[player] = e.asEuint256(0);
        level[player] = e.asEuint256(1);
        hp[player] = e.asEuint256(100);
        atk[player] = e.asEuint256(10);
        defStat[player] = e.asEuint256(5);
        luck[player] = e.asEuint256(5);
        questDust[player] = e.asEuint256(0);

        _allow(crystalDust[player], player);
        _allow(potions[player], player);
        _allow(mapPieces[player], player);
        _allow(xp[player], player);
        _allow(level[player], player);
        _allow(hp[player], player);
        _allow(atk[player], player);
        _allow(defStat[player], player);
        _allow(luck[player], player);
        _allow(questDust[player], player);
    }

    /// @notice Bind a session key that may call collect() for this player until expiry.
    /// @dev Call once from the main wallet after generating an ephemeral key client-side.
    function setSessionKey(address session, uint64 expiresAt) external {
        require(session != address(0), "session");
        require(expiresAt > block.timestamp, "expiry");
        require(session != msg.sender, "not self");

        // Clear previous reverse mapping if any
        address prev = sessionOf[msg.sender];
        if (prev != address(0)) {
            delete playerOf[prev];
            delete sessionExpiry[prev];
        }

        sessionOf[msg.sender] = session;
        playerOf[session] = msg.sender;
        sessionExpiry[session] = expiresAt;

        if (!registered[msg.sender]) {
            _initPlayer(msg.sender);
            emit Registered(msg.sender);
        } else {
            // Re-allow existing handles to the new session
            _reallowAll(msg.sender);
        }

        emit SessionKeySet(msg.sender, session, expiresAt);
    }

    function _reallowAll(address player) internal {
        if (euint256.unwrap(crystalDust[player]) != bytes32(0)) _allow(crystalDust[player], player);
        if (euint256.unwrap(potions[player]) != bytes32(0)) _allow(potions[player], player);
        if (euint256.unwrap(mapPieces[player]) != bytes32(0)) _allow(mapPieces[player], player);
        if (euint256.unwrap(xp[player]) != bytes32(0)) _allow(xp[player], player);
        if (euint256.unwrap(level[player]) != bytes32(0)) _allow(level[player], player);
        if (euint256.unwrap(hp[player]) != bytes32(0)) _allow(hp[player], player);
        if (euint256.unwrap(atk[player]) != bytes32(0)) _allow(atk[player], player);
        if (euint256.unwrap(defStat[player]) != bytes32(0)) _allow(defStat[player], player);
        if (euint256.unwrap(luck[player]) != bytes32(0)) _allow(luck[player], player);
        if (euint256.unwrap(questDust[player]) != bytes32(0)) _allow(questDust[player], player);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core game action
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Collect a crystal. Callable by the player EOA or their session key.
    /// @dev Updates encrypted dust, XP, luck (tiny bump), and quest progress.
    ///      Uses only trivial-encrypt adds — no Inco fee required; contract may still hold ETH.
    function collect(uint8 crystalId) external {
        require(crystalId < CRYSTAL_COUNT, "crystal id");
        address player = _player();
        if (!registered[player]) {
            require(msg.sender == player, "register first");
            _initPlayer(player);
            emit Registered(player);
        }
        require(!collected[player][crystalId], "already taken");

        collected[player][crystalId] = true;

        // Encrypted inventory / progression updates
        crystalDust[player] = _add(crystalDust[player], DUST_PER_CRYSTAL, player);
        xp[player] = _add(xp[player], XP_PER_CRYSTAL, player);
        questDust[player] = _add(questDust[player], DUST_PER_CRYSTAL, player);

        // Soft luck bump every crystal (confidential)
        luck[player] = _add(luck[player], 1, player);

        // Confidential level-up: if xp >= level * 100, level += 1 and bump stats.
        // Multiplexer pattern — no branching on plaintext secrets.
        euint256 thr = e.mul(level[player], e.asEuint256(100));
        ebool leveled = e.ge(xp[player], thr);
        level[player] = e.add(level[player], e.select(leveled, e.asEuint256(1), e.asEuint256(0)));
        hp[player] = e.add(hp[player], e.select(leveled, e.asEuint256(10), e.asEuint256(0)));
        atk[player] = e.add(atk[player], e.select(leveled, e.asEuint256(2), e.asEuint256(0)));
        defStat[player] = e.add(defStat[player], e.select(leveled, e.asEuint256(1), e.asEuint256(0)));
        _allow(level[player], player);
        _allow(hp[player], player);
        _allow(atk[player], player);
        _allow(defStat[player], player);

        // Occasional potion / map piece from higher crystal ids (public rule, private amount)
        if (crystalId % 4 == 3) {
            potions[player] = _add(potions[player], 1, player);
        }
        if (crystalId % 5 == 4) {
            mapPieces[player] = _add(mapPieces[player], 1, player);
        }

        emit CrystalCollected(player, crystalId, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views — opaque handles only
    // ─────────────────────────────────────────────────────────────────────────

    function getHandles(address player)
        external
        view
        returns (
            bytes32 dust,
            bytes32 pot,
            bytes32 maps,
            bytes32 xpH,
            bytes32 lvl,
            bytes32 hpH,
            bytes32 atkH,
            bytes32 defH,
            bytes32 luckH,
            bytes32 quest
        )
    {
        dust = euint256.unwrap(crystalDust[player]);
        pot = euint256.unwrap(potions[player]);
        maps = euint256.unwrap(mapPieces[player]);
        xpH = euint256.unwrap(xp[player]);
        lvl = euint256.unwrap(level[player]);
        hpH = euint256.unwrap(hp[player]);
        atkH = euint256.unwrap(atk[player]);
        defH = euint256.unwrap(defStat[player]);
        luckH = euint256.unwrap(luck[player]);
        quest = euint256.unwrap(questDust[player]);
    }

    function isCollected(address player, uint8 crystalId) external view returns (bool) {
        return collected[player][crystalId];
    }

    function getCollectedMask(address player) external view returns (uint16 mask) {
        for (uint8 i = 0; i < CRYSTAL_COUNT; i++) {
            if (collected[player][i]) {
                mask |= uint16(1 << i);
            }
        }
    }

    receive() external payable {}
}
