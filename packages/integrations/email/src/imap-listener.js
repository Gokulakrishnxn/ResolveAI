"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapIdleListener = void 0;
var imapflow_1 = require("imapflow");
var mailparser_1 = require("mailparser");
var shared_1 = require("@resolveai/shared");
var threading_js_1 = require("./threading.js");
/**
 * Long-lived per-mailbox IMAP IDLE listener.
 *
 * Usage:
 *   const listener = new ImapIdleListener(opts);
 *   await listener.start(handler);
 *   // ... later ...
 *   await listener.stop();
 *
 * Reconnects automatically on transient errors. Tracks the last seen UID
 * via `lastSeenUid` so we don't reprocess on restart (caller persists it).
 */
var ImapIdleListener = /** @class */ (function () {
    function ImapIdleListener(opts) {
        var _a, _b, _c;
        this.client = null;
        this.running = false;
        this.stopRequested = false;
        this.handler = null;
        this.opts = {
            host: opts.host,
            port: opts.port,
            secure: opts.secure,
            user: opts.user,
            password: opts.password,
            mailbox: (_a = opts.mailbox) !== null && _a !== void 0 ? _a : 'INBOX',
            reconnectDelayMs: (_b = opts.reconnectDelayMs) !== null && _b !== void 0 ? _b : 5000,
            idleRefreshMs: (_c = opts.idleRefreshMs) !== null && _c !== void 0 ? _c : 25 * 60000,
            logger: opts.logger,
            lastSeenUid: opts.lastSeenUid,
        };
    }
    Object.defineProperty(ImapIdleListener.prototype, "lastSeenUid", {
        get: function () {
            return this.opts.lastSeenUid;
        },
        enumerable: false,
        configurable: true
    });
    ImapIdleListener.prototype.start = function (handler) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.running)
                    throw new shared_1.IntegrationError('ImapIdleListener already running');
                this.handler = handler;
                this.running = true;
                this.stopRequested = false;
                void this.runForever();
                return [2 /*return*/];
            });
        });
    };
    ImapIdleListener.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.stopRequested = true;
                        if (!this.client) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.client.logout().catch(function () { return undefined; })];
                    case 1:
                        _a.sent();
                        this.client = null;
                        _a.label = 2;
                    case 2:
                        this.running = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    ImapIdleListener.prototype.log = function (level, msg) {
        var _a, _b;
        (_b = (_a = this.opts.logger) === null || _a === void 0 ? void 0 : _a[level]) === null || _b === void 0 ? void 0 : _b.call(_a, msg);
    };
    ImapIdleListener.prototype.runForever = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.stopRequested) return [3 /*break*/, 7];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.connectAndIdle()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        this.log('error', "imap-idle: error: ".concat(err_1 instanceof Error ? err_1.message : String(err_1)));
                        return [3 /*break*/, 4];
                    case 4:
                        if (!!this.stopRequested) return [3 /*break*/, 6];
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, _this.opts.reconnectDelayMs); })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 0];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ImapIdleListener.prototype.connectAndIdle = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, client, lock, onExists, refreshTimer;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            host: this.opts.host,
                            port: this.opts.port,
                            secure: this.opts.secure,
                            auth: { user: this.opts.user, pass: this.opts.password },
                            logger: false,
                        };
                        client = new imapflow_1.ImapFlow(config);
                        this.client = client;
                        return [4 /*yield*/, client.connect()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, client.getMailboxLock(this.opts.mailbox)];
                    case 2:
                        lock = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, , 11, 13]);
                        this.log('info', "imap-idle: connected ".concat(this.opts.user, "/").concat(this.opts.mailbox));
                        // 1) Drain anything new since lastSeenUid.
                        return [4 /*yield*/, this.drain(client)];
                    case 4:
                        // 1) Drain anything new since lastSeenUid.
                        _a.sent();
                        onExists = function () {
                            // Schedule a drain — we may be inside an event loop tick.
                            void _this.drain(client).catch(function (err) {
                                _this.log('error', "imap-idle: drain failed: ".concat(err.message));
                            });
                        };
                        client.on('exists', onExists);
                        _a.label = 5;
                    case 5:
                        if (!!this.stopRequested) return [3 /*break*/, 10];
                        refreshTimer = setTimeout(function () {
                            // ImapFlow auto-refreshes IDLE, but we still set a max bound.
                        }, this.opts.idleRefreshMs);
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, , 8, 9]);
                        return [4 /*yield*/, client.idle()];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        clearTimeout(refreshTimer);
                        return [7 /*endfinally*/];
                    case 9: return [3 /*break*/, 5];
                    case 10:
                        client.off('exists', onExists);
                        return [3 /*break*/, 13];
                    case 11:
                        lock.release();
                        return [4 /*yield*/, client.logout().catch(function () { return undefined; })];
                    case 12:
                        _a.sent();
                        if (this.client === client)
                            this.client = null;
                        return [7 /*endfinally*/];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    ImapIdleListener.prototype.drain = function (client) {
        return __awaiter(this, void 0, void 0, function () {
            var since, range, search, _loop_1, this_1, _i, search_1, uid;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (!this.handler)
                            return [2 /*return*/];
                        since = (_a = this.opts.lastSeenUid) !== null && _a !== void 0 ? _a : 0;
                        range = "".concat(since + 1, ":*");
                        return [4 /*yield*/, client.search({ uid: range, seen: false }, { uid: true })];
                    case 1:
                        search = _h.sent();
                        if (!search || search.length === 0)
                            return [2 /*return*/];
                        _loop_1 = function (uid) {
                            var msg, parsed, fromAddr, toAddrs, refsList, inbound, err_2;
                            return __generator(this, function (_j) {
                                switch (_j.label) {
                                    case 0:
                                        // Defensive: search with `range` may return UIDs <= since on edge cases.
                                        if (uid <= since)
                                            return [2 /*return*/, "continue"];
                                        return [4 /*yield*/, client.fetchOne(uid, { source: true, envelope: true }, { uid: true })];
                                    case 1:
                                        msg = _j.sent();
                                        if (!msg || !msg.source)
                                            return [2 /*return*/, "continue"];
                                        return [4 /*yield*/, (0, mailparser_1.simpleParser)(msg.source)];
                                    case 2:
                                        parsed = _j.sent();
                                        fromAddr = (_c = (_b = parsed.from) === null || _b === void 0 ? void 0 : _b.value[0]) === null || _c === void 0 ? void 0 : _c.address;
                                        if (!!fromAddr) return [3 /*break*/, 4];
                                        return [4 /*yield*/, client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }).catch(function () { return undefined; })];
                                    case 3:
                                        _j.sent();
                                        this_1.opts.lastSeenUid = uid;
                                        return [2 /*return*/, "continue"];
                                    case 4:
                                        toAddrs = (function () {
                                            var t = parsed.to;
                                            if (!t)
                                                return [];
                                            var arr = Array.isArray(t) ? t : [t];
                                            return arr.flatMap(function (a) { return a.value.map(function (v) { return v.address; }).filter(Boolean); });
                                        })();
                                        refsList = Array.isArray(parsed.references)
                                            ? parsed.references
                                            : parsed.references
                                                ? [parsed.references]
                                                : [];
                                        inbound = {
                                            messageId: (_d = parsed.messageId) !== null && _d !== void 0 ? _d : "<".concat(uid, "@").concat(this_1.opts.host, ">"),
                                            rawMessageId: (0, threading_js_1.normalizeMessageId)(parsed.messageId),
                                            from: fromAddr,
                                            to: toAddrs.length ? toAddrs : [this_1.opts.user],
                                            subject: (_e = parsed.subject) !== null && _e !== void 0 ? _e : '',
                                            text: (_f = parsed.text) !== null && _f !== void 0 ? _f : '',
                                            html: typeof parsed.html === 'string' ? parsed.html : undefined,
                                            inReplyTo: parsed.inReplyTo,
                                            references: refsList,
                                            receivedAt: (_g = parsed.date) !== null && _g !== void 0 ? _g : new Date(),
                                            uid: uid,
                                            threadKey: (0, threading_js_1.deriveThreadKey)({
                                                inReplyTo: parsed.inReplyTo,
                                                references: refsList,
                                                messageId: parsed.messageId,
                                                subject: parsed.subject,
                                                fromAddress: fromAddr,
                                            }),
                                        };
                                        _j.label = 5;
                                    case 5:
                                        _j.trys.push([5, 7, , 8]);
                                        return [4 /*yield*/, this_1.handler(inbound)];
                                    case 6:
                                        _j.sent();
                                        return [3 /*break*/, 8];
                                    case 7:
                                        err_2 = _j.sent();
                                        this_1.log('error', "imap-idle: handler failed for UID ".concat(uid, ": ").concat(err_2.message));
                                        return [2 /*return*/, "continue"];
                                    case 8: return [4 /*yield*/, client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }).catch(function () { return undefined; })];
                                    case 9:
                                        _j.sent();
                                        this_1.opts.lastSeenUid = uid;
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, search_1 = search;
                        _h.label = 2;
                    case 2:
                        if (!(_i < search_1.length)) return [3 /*break*/, 5];
                        uid = search_1[_i];
                        return [5 /*yield**/, _loop_1(uid)];
                    case 3:
                        _h.sent();
                        _h.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return ImapIdleListener;
}());
exports.ImapIdleListener = ImapIdleListener;
