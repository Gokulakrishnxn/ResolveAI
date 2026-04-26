"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.SmtpClient = void 0;
var nodemailer_1 = require("nodemailer");
var shared_1 = require("@resolveai/shared");
function ensureBracketedMessageId(id) {
    var trimmed = id.trim();
    if (trimmed.startsWith('<') && trimmed.endsWith('>'))
        return trimmed;
    return "<".concat(trimmed.replace(/^<|>$/g, ''), ">");
}
var SmtpClient = /** @class */ (function () {
    function SmtpClient(opts) {
        this.transporter = nodemailer_1.default.createTransport(__assign({ host: opts.host, port: opts.port, secure: opts.secure, auth: { user: opts.user, pass: opts.password } }, (opts.dkim
            ? {
                dkim: {
                    domainName: opts.dkim.domainName,
                    keySelector: opts.dkim.keySelector,
                    privateKey: opts.dkim.privateKey,
                },
            }
            : {})));
        this.from = opts.from;
        this.breaker = new shared_1.CircuitBreaker({
            name: "smtp:".concat(opts.host),
            failureThreshold: 5,
            resetTimeoutMs: 60000,
        });
    }
    SmtpClient.prototype.send = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var inReplyTo, references;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                inReplyTo = args.inReplyTo ? ensureBracketedMessageId(args.inReplyTo) : undefined;
                references = ((_a = args.references) !== null && _a !== void 0 ? _a : []).map(ensureBracketedMessageId);
                return [2 /*return*/, this.breaker.execute(function () {
                        return (0, shared_1.retry)(function () { return __awaiter(_this, void 0, void 0, function () {
                            var info, err_1;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, this.transporter.sendMail({
                                                from: (_a = args.from) !== null && _a !== void 0 ? _a : this.from,
                                                to: args.to,
                                                subject: args.subject,
                                                text: args.text,
                                                html: args.html,
                                                inReplyTo: inReplyTo,
                                                references: references.length > 0 ? references : undefined,
                                                replyTo: args.replyTo,
                                                headers: args.headers,
                                            })];
                                    case 1:
                                        info = _b.sent();
                                        return [2 /*return*/, {
                                                messageId: info.messageId,
                                                accepted: info.accepted.map(String),
                                                rejected: info.rejected.map(String),
                                            }];
                                    case 2:
                                        err_1 = _b.sent();
                                        throw new shared_1.IntegrationError("SMTP send failed: ".concat(err_1 instanceof Error ? err_1.message : String(err_1)));
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }, { retries: 2, minTimeoutMs: 1000, maxTimeoutMs: 5000 });
                    })];
            });
        });
    };
    SmtpClient.prototype.verify = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transporter.verify()];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SmtpClient.prototype.close = function () {
        this.transporter.close();
    };
    return SmtpClient;
}());
exports.SmtpClient = SmtpClient;
