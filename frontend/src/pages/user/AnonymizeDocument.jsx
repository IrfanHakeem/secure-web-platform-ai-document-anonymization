import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Download, FileCheck2, FileText, FileUp, Info,
  LockKeyhole, RotateCcw, SearchCheck, Share2, ShieldCheck,
  Sparkles, UploadCloud, X,
} from 'lucide-react'
import api from '../../api/client'

// All requests and security checks below use the existing SECURA endpoints.
// AI percent reports completed backend workflow checkpoints, not elapsed-time estimates.
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'xlsx', 'csv']
const MAX_FILE_SIZE = 25 * 1024 * 1024
const PII_LABELS = {
  NAME: 'Names', EMAIL: 'Email addresses', PHONE: 'Phone numbers',
  MALAYSIAN_IC: 'Malaysian IC numbers',
}
const formatBytes = (bytes) => {
  if (!Number.isFinite(Number(bytes))) return '—'
  if (Number(bytes) < 1024) return `${bytes} B`
  if (Number(bytes) < 1048576) return `${(Number(bytes) / 1024).toFixed(1)} KB`
  return `${(Number(bytes) / 1048576).toFixed(1)} MB`
}
function errorMessage(error, fallback) {
  return typeof error?.response?.data?.detail === 'string' ? error.response.data.detail : fallback
}
function getExtension(name) { return String(name || '').split('.').pop()?.toLowerCase() }

// SECURA V15.3.1: styles live in this existing component to avoid Windows CSS watcher EBUSY.
// Content is static, scoped to the User anonymization workspace, and not built from user input.
const SECURA_ANONYMIZE_STYLES = String.raw`/* SECURA NeoFlow V15.3 | Guided User Anonymization Workspace.
   Deliberately scoped: does not change Admin, Security, Login or other User pages. */
.secura-user-neo.uad15__shell-root { --uad-grad:linear-gradient(112deg,#e4f0ff 2%,#f2ebff 55%,#e8dcff 100%); }
html:not([data-theme="light"]) .secura-user-neo.uad15__shell-root { --uad-grad:linear-gradient(115deg,#273752,#2c2a4a 58%,#3a3059); }
.secura-user-neo .uad15__workspace { min-height:100vh; }
.secura-user-neo .uad15__topbar { position:sticky;top:0;z-index:20;justify-content:space-between;min-height:67px;height:67px;padding-inline:clamp(16px,2vw,32px); }
.secura-user-neo .uad15__topbar-name { display:flex;align-items:center;gap:9px;font-size:10px;font-weight:900;letter-spacing:.12em;color:var(--sun-muted); }
.secura-user-neo .uad15__topbar-name svg { color:#9179e8; }
.secura-user-neo .uad15__profile-link {border:1px solid var(--sun-line);display:inline-flex;align-items:center;gap:9px;background:var(--sun-card);border-radius:11px;padding:10px 13px;font-size:11px;font-weight:850;transition:border-color .18s,transform .18s,box-shadow .18s;}
.secura-user-neo .uad15__profile-link:hover {transform:translateY(-2px);border-color:#9179e8;box-shadow:0 5px 18px rgba(145,121,232,.12);}
.secura-user-neo .uad15__workspace-main {max-width:1500px;padding:clamp(16px,2.3vw,32px);margin:auto;min-width:0;}
.secura-user-neo .uad15__page {color:var(--sun-text);font-size:13px;min-width:0;}
.secura-user-neo .uad15__page *, .secura-user-neo .uad15__page *::before,.secura-user-neo .uad15__page *::after {box-sizing:border-box;}
.secura-user-neo .uad15__page h1,.secura-user-neo .uad15__page h2,.secura-user-neo .uad15__page h3,.secura-user-neo .uad15__page p{margin:0;}
.secura-user-neo .uad15__page button{font:inherit;}
.secura-user-neo .uad15__eyebrow,.secura-user-neo .uad15__overline{font-size:10px;font-weight:900;letter-spacing:.12em;color:#9978e9;}
.secura-user-neo .uad15__eyebrow{display:inline-flex;align-items:center;gap:7px;}
.secura-user-neo .uad15__page-head{border-radius:23px;border:1px solid #d5dcff;background:var(--uad-grad);min-height:196px;padding:clamp(25px,3vw,38px);position:relative;display:flex;align-items:center;gap:20px;justify-content:space-between;overflow:hidden;box-shadow:var(--sun-shadow);isolation:isolate;}
html:not([data-theme="light"]) .secura-user-neo .uad15__page-head{border-color:#44496e;}
.secura-user-neo .uad15__page-head::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 91% 25%,rgba(164,119,255,.23),transparent 33%);z-index:-1;}
.secura-user-neo .uad15__page-head h1{font-size:clamp(31px,3vw,49px);letter-spacing:-.055em;line-height:1.13;font-weight:900;margin:9px 0 13px;}
.secura-user-neo .uad15__page-head h1 span{background:linear-gradient(100deg,#53c5ec,#a38af8,#f09ad9,#53c5ec);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:uad15-wave 7s linear infinite;}
.secura-user-neo .uad15__page-head p{max-width:630px;color:var(--sun-muted);font-size:12px;line-height:1.7;}
html:not([data-theme="light"]) .secura-user-neo .uad15__page-head p{color:#c2cce0;}
.secura-user-neo .uad15__library-link{display:inline-flex;align-items:center;justify-content:center;gap:9px;white-space:nowrap;border:1px solid rgba(147,114,234,.32);background:rgba(255,255,255,.55);padding:12px 16px;border-radius:12px;font-size:11px;font-weight:850;z-index:1;transition:transform .18s,box-shadow .18s;}
html:not([data-theme="light"]) .secura-user-neo .uad15__library-link{background:rgba(255,255,255,.07);color:#fff;}
.secura-user-neo .uad15__library-link:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(100,80,196,.14);}
.secura-user-neo .uad15__head-glow{position:absolute;right:-90px;bottom:-160px;width:420px;height:320px;border-radius:50%;background:rgba(148,101,247,.1);filter:blur(36px);pointer-events:none;z-index:-1;}
.secura-user-neo .uad15__progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:17px 0 18px;}
.secura-user-neo .uad15__stage{display:flex;align-items:center;position:relative;gap:12px;min-height:77px;padding:14px;border:1px solid var(--sun-line);border-radius:17px;background:var(--sun-card);box-shadow:var(--sun-shadow);opacity:.68;transition:border-color .18s,opacity .18s,transform .18s;}
.secura-user-neo .uad15__stage.is-current,.secura-user-neo .uad15__stage.is-done{opacity:1;}
.secura-user-neo .uad15__stage.is-current{border-color:#9d87ef;box-shadow:0 8px 27px rgba(133,104,221,.12),inset 3px 0 #9673ea;}
.secura-user-neo .uad15__stage-icon{height:39px;width:39px;border-radius:12px;display:grid;place-items:center;flex-shrink:0;background:var(--sun-field);color:#8b74dc;}
.secura-user-neo .uad15__stage.is-current .uad15__stage-icon{background:linear-gradient(135deg,#8669e8,#bc70ee);color:#fff;}
.secura-user-neo .uad15__stage.is-done .uad15__stage-icon{background:rgba(45,190,157,.15);color:#36cda5;}
.secura-user-neo .uad15__stage-copy{display:flex;min-width:0;flex-direction:column;gap:3px;}
.secura-user-neo .uad15__stage-copy b{font-size:12px;font-weight:850;}
.secura-user-neo .uad15__stage-copy small{font-size:10px;color:var(--sun-muted);}
.secura-user-neo .uad15__stage-chevron{margin-left:auto;color:var(--sun-muted);}
.secura-user-neo .uad15__main-grid,.secura-user-neo .uad15__results-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:18px;align-items:stretch;}
.secura-user-neo .uad15__card{min-width:0;border:1px solid var(--sun-line);background:var(--sun-card);border-radius:21px;box-shadow:var(--sun-shadow);padding:clamp(18px,2.1vw,27px);transition:border-color .22s,box-shadow .22s;}
.secura-user-neo .uad15__card:hover{border-color:rgba(161,133,242,.48);box-shadow:0 15px 35px rgba(77,55,164,.075);}
html:not([data-theme="light"]) .secura-user-neo .uad15__card:hover{box-shadow:0 15px 40px rgba(0,0,0,.19),0 0 26px rgba(142,98,235,.07);}
.secura-user-neo .uad15__card-heading{display:flex;align-items:flex-start;gap:13px;margin-bottom:20px;}
.secura-user-neo .uad15__icon{flex:0 0 43px;width:43px;height:43px;display:grid;place-items:center;border-radius:13px;}
.secura-user-neo .uad15__icon.is-blue{background:rgba(42,148,235,.14);color:#3799ef;}
.secura-user-neo .uad15__icon.is-purple{background:rgba(149,102,231,.15);color:#a077ee;}
.secura-user-neo .uad15__icon.is-green{background:rgba(36,179,143,.15);color:#2ec49d;}
.secura-user-neo .uad15__card-heading h2{font-size:19px;letter-spacing:-.03em;font-weight:850;margin:2px 0 5px;}
.secura-user-neo .uad15__card-heading p{font-size:11px;color:var(--sun-muted);line-height:1.6;}
.secura-user-neo .uad15__hidden-file{display:none;}
.secura-user-neo .uad15__drop{width:100%;min-height:290px;padding:28px 18px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:11px;text-align:center;border:1.5px dashed #a7a0e9;border-radius:17px;background:radial-gradient(circle at 50% 20%,rgba(157,116,241,.09),transparent 56%),var(--sun-field);position:relative;overflow:hidden;transition:border-color .18s,background .18s,transform .18s;}
.secura-user-neo .uad15__drop:hover,.secura-user-neo .uad15__drop.is-dragged{border-color:#a36aff;background:rgba(145,102,240,.11);}
.secura-user-neo .uad15__drop.is-dragged{transform:scale(1.008);}
.secura-user-neo .uad15__drop.is-uploaded{border-color:#3ac49b;}
.secura-user-neo .uad15__drop-art{height:98px;width:100px;display:grid;place-items:center;position:relative;transform:rotate(-7deg);border-radius:25px;background:linear-gradient(135deg,#d8eeff,#daceff);color:#665be1;box-shadow:0 15px 34px rgba(97,103,196,.13);transition:transform .23s;}
.secura-user-neo .uad15__drop:hover .uad15__drop-art{transform:rotate(0deg) translateY(-4px);}
.secura-user-neo .uad15__drop-art > span{position:absolute;bottom:-9px;right:-12px;display:grid;place-items:center;width:45px;height:45px;border-radius:15px;color:#fff;background:linear-gradient(135deg,#5c96f8,#a564e7);box-shadow:0 10px 26px rgba(107,99,210,.28);}
.secura-user-neo .uad15__drop > b{font-size:14px;font-weight:850;overflow-wrap:anywhere;max-width:100%;}
.secura-user-neo .uad15__drop > span:not(.uad15__drop-art):not(.uad15__busy-line){font-size:11px;color:var(--sun-muted);max-width:100%;overflow-wrap:anywhere;}
.secura-user-neo .uad15__drop > em{font-size:10px;font-style:normal;color:var(--sun-muted);}
.secura-user-neo .uad15__busy-line{position:absolute;left:-20%;bottom:0;width:45%;height:3px;background:linear-gradient(90deg,transparent,#a474ea,transparent);animation:uad15-load 1.2s ease-in-out infinite;}
.secura-user-neo .uad15__file-bottom{padding:15px 0 0;display:flex;justify-content:space-between;align-items:center;gap:8px;}
.secura-user-neo .uad15__file-summary{display:flex;align-items:center;gap:11px;min-width:0;flex:1;}
.secura-user-neo .uad15__file-symbol{height:39px;width:39px;display:grid;place-items:center;border-radius:12px;background:var(--sun-field);color:var(--sun-muted);flex-shrink:0;}
.secura-user-neo .uad15__file-symbol.is-ready{color:#31ba97;background:rgba(47,187,144,.13);}
.secura-user-neo .uad15__file-summary > span:nth-child(2){display:flex;flex-direction:column;gap:3px;min-width:0;}
.secura-user-neo .uad15__file-summary b{font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.secura-user-neo .uad15__file-summary small{font-size:10px;color:var(--sun-muted);}
.secura-user-neo .uad15__valid{color:#37bf98;flex-shrink:0;}
.secura-user-neo .uad15__change{flex-shrink:0;border:0;background:transparent;color:#9377eb;font-weight:800;font-size:10px;}
.secura-user-neo .uad15__process-card{display:flex;flex-direction:column;align-items:stretch;}
.secura-user-neo .uad15__ai-visual{width:160px;height:160px;align-self:center;position:relative;margin:3px 0 2px;display:grid;place-items:center;}
.secura-user-neo .uad15__ai-ring{position:absolute;border-radius:50%;inset:5px;border:1px solid rgba(151,115,233,.38);}
.secura-user-neo .uad15__ai-ring.two{inset:23px;border-style:dashed;opacity:.58;}
.secura-user-neo .uad15__ai-visual.is-active .uad15__ai-ring.one{animation:uad15-rotate 8s linear infinite;border-style:dashed;border-width:2px;}
.secura-user-neo .uad15__ai-visual.is-active .uad15__ai-center{animation:uad15-breath 1.9s ease-in-out infinite;}
.secura-user-neo .uad15__ai-center{width:83px;height:83px;display:grid;place-items:center;border-radius:25px;color:#b7a1ff;background:linear-gradient(145deg,#312963,#282e55);box-shadow:0 0 35px rgba(145,103,237,.22),inset 0 0 0 5px rgba(255,255,255,.025);}
html[data-theme="light"] .secura-user-neo .uad15__ai-center{background:linear-gradient(145deg,#e9dfff,#e5efff);color:#8269dc;}
.secura-user-neo .uad15__orbit-dot{position:absolute;width:9px;height:9px;border-radius:50%;background:#9a7ce7;box-shadow:0 0 12px rgba(137,102,227,.35);}
.secura-user-neo .uad15__orbit-dot.dot-a{left:6px;top:40px;}
.secura-user-neo .uad15__orbit-dot.dot-b{right:20px;bottom:16px;background:#5fcacc;}
.secura-user-neo .uad15__ai-copy{text-align:center;margin:3px auto 21px;max-width:360px;}
.secura-user-neo .uad15__ai-copy b{font-size:13px;font-weight:850;}
.secura-user-neo .uad15__ai-copy p{font-size:11px;line-height:1.6;color:var(--sun-muted);margin-top:7px;}
.secura-user-neo .uad15__protection-list{display:grid;grid-template-columns:1fr;gap:8px;margin-top:auto;padding:14px 0;}
.secura-user-neo .uad15__protection-list span{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--sun-muted);}
.secura-user-neo .uad15__protection-list svg{color:#37bd9c;}
.secura-user-neo .uad15__primary,.secura-user-neo .uad15__download{border:0;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:14px 19px;color:#fff!important;background:linear-gradient(105deg,#6e6aed,#ac51e8);font-weight:850;font-size:12px!important;box-shadow:0 12px 24px rgba(107,80,223,.23);transition:transform .18s,box-shadow .18s,filter .18s;}
.secura-user-neo .uad15__primary:hover:not(:disabled),.secura-user-neo .uad15__download:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 30px rgba(107,80,223,.31);filter:brightness(1.07);}
.secura-user-neo .uad15__primary:disabled{background:#827cba;box-shadow:none;opacity:.55;}
.secura-user-neo .uad15__primary svg:last-child{margin-left:auto;}
.secura-user-neo .uad15__spinner{height:17px;width:17px;border:2px solid rgba(255,255,255,.42);border-top-color:#fff;border-radius:50%;animation:uad15-rotate .8s linear infinite;}
.secura-user-neo .uad15__notice{display:flex;align-items:center;gap:10px;border:1px solid;margin:14px 0;border-radius:12px;padding:12px 14px;font-size:11px;font-weight:700;}
.secura-user-neo .uad15__notice span{flex:1;}
.secura-user-neo .uad15__notice button{background:none;border:0;display:grid;place-items:center;}
.secura-user-neo .uad15__notice.is-error{border-color:rgba(228,104,124,.35);color:#ef8b9a;background:rgba(239,89,111,.085);}
.secura-user-neo .uad15__notice.is-success{border-color:rgba(50,183,145,.3);color:#30b38f;background:rgba(50,183,145,.08);}
.secura-user-neo .uad15__result-stack{display:grid;gap:18px;}
.secura-user-neo .uad15__complete-hero{display:flex;align-items:center;gap:19px;min-width:0;border-radius:21px;padding:24px 25px;background:linear-gradient(110deg,rgba(67,184,145,.11),rgba(107,111,230,.1));border:1px solid rgba(55,186,155,.3);}
.secura-user-neo .uad15__complete-icon{flex:0 0 60px;height:60px;display:grid;place-items:center;background:rgba(46,190,150,.16);color:#2ac29c;border-radius:18px;animation:uad15-pop .3s ease-out both;}
.secura-user-neo .uad15__complete-hero > div{flex:1;min-width:0;}
.secura-user-neo .uad15__complete-hero h2{font-size:23px;letter-spacing:-.03em;margin:5px 0;}
.secura-user-neo .uad15__complete-hero p{font-size:11px;color:var(--sun-muted);overflow-wrap:anywhere;}
.secura-user-neo .uad15__count{display:flex;gap:15px;align-items:center;border:1px solid var(--sun-line);background:var(--sun-field);border-radius:16px;padding:15px;margin-bottom:15px;}
.secura-user-neo .uad15__count strong{font-size:42px;line-height:1;font-weight:900;color:#9874eb;}
.secura-user-neo .uad15__count span{font-size:12px;font-weight:800;}
.secura-user-neo .uad15__pii-list{display:grid;gap:0;margin-bottom:15px;}
.secura-user-neo .uad15__pii-list > div{display:flex;justify-content:space-between;gap:12px;padding:11px 4px;border-bottom:1px solid var(--sun-line);font-size:11px;color:var(--sun-muted);}
.secura-user-neo .uad15__pii-list b{color:var(--sun-text);}
.secura-user-neo .uad15__secondary{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid var(--sun-line);background:var(--sun-field);border-radius:11px;padding:11px 13px;font-size:11px;font-weight:850;transition:border-color .18s,transform .18s;}
.secura-user-neo .uad15__secondary:hover{border-color:#977bed;transform:translateY(-1px);}
.secura-user-neo .uad15__wide{width:100%;}
.secura-user-neo .uad15__report-details{margin-top:12px;display:grid;gap:10px;border:1px solid var(--sun-line);border-radius:12px;padding:13px;background:var(--sun-field);font-size:11px;color:var(--sun-muted);}
.secura-user-neo .uad15__report-details b{color:var(--sun-text);}
.secura-user-neo .uad15__report-details button{display:flex;align-items:center;gap:7px;border:0;background:transparent;color:#9872ea;font-weight:850;text-align:left;}
.secura-user-neo .uad15__share-panel{display:flex;flex-direction:column;gap:13px;}
.secura-user-neo .uad15__share-panel .uad15__card-heading{margin-bottom:7px;}
.secura-user-neo .uad15__shared-state{display:flex;gap:12px;align-items:center;padding:16px;border:1px solid var(--sun-line);background:var(--sun-field);border-radius:15px;margin-bottom:4px;}
.secura-user-neo .uad15__shared-state svg{color:#2ec49d;flex-shrink:0;}
.secura-user-neo .uad15__shared-state span{display:grid;gap:5px;}
.secura-user-neo .uad15__shared-state b{font-size:12px;}
.secura-user-neo .uad15__shared-state small{font-size:10px;color:var(--sun-muted);}
.secura-user-neo .uad15__restart{margin-top:auto;display:flex;gap:8px;align-items:center;justify-content:center;border:0;background:transparent;padding:12px;color:#9276e6;font-size:11px;font-weight:800;}
.secura-user-neo .uad15__share-options{display:grid;gap:10px;border:1px solid var(--sun-line);border-radius:13px;padding:13px;background:var(--sun-field);}
.secura-user-neo .uad15__share-options p,.secura-user-neo .uad15__share-options > small{font-size:10px;color:var(--sun-muted);}
.secura-user-neo .uad15__share-options label{display:flex;align-items:center;gap:9px;font-size:11px;border-radius:9px;background:var(--sun-card);padding:10px;}
.secura-user-neo .uad15__share-options label > span{flex:1;}
.secura-user-neo .uad15__share-options label small{color:#2ec49d;}
.secura-user-neo .uad15__share-options input{accent-color:#8b69e5;}
.secura-user-neo .uad15__footer{border:1px solid var(--sun-line);border-radius:13px;margin-top:19px;padding:13px 17px;display:flex;align-items:center;gap:11px;color:var(--sun-muted);font-size:10px;line-height:1.6;background:var(--sun-card);}
.secura-user-neo .uad15__footer svg{color:#45bfa0;flex-shrink:0;}
.secura-user-neo .uad15__modal-backdrop{position:fixed;inset:0;z-index:250;background:rgba(9,12,26,.76);display:grid;place-items:center;padding:16px;backdrop-filter:blur(6px);}
.secura-user-neo .uad15__modal{width:min(900px,100%);max-height:min(82vh,800px);overflow:auto;background:var(--sun-card);color:var(--sun-text);border:1px solid var(--sun-line);border-radius:21px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.32);}
.secura-user-neo .uad15__modal-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
.secura-user-neo .uad15__modal-title h2{font-size:22px;margin-top:5px;}
.secura-user-neo .uad15__modal-title button{border:1px solid var(--sun-line);border-radius:10px;background:var(--sun-field);padding:9px;display:grid;place-items:center;}
.secura-user-neo .uad15__modal > p{color:var(--sun-muted);font-size:11px;margin-bottom:18px;}
.secura-user-neo .uad15__replacement-table{border:1px solid var(--sun-line);border-radius:13px;overflow:auto;margin-bottom:17px;}
.secura-user-neo .uad15__replacement-head,.secura-user-neo .uad15__replacement-row{min-width:580px;display:grid;grid-template-columns:1fr 1.1fr 1.1fr;gap:12px;padding:12px;border-bottom:1px solid var(--sun-line);font-size:11px;}
.secura-user-neo .uad15__replacement-head{background:var(--sun-field);font-size:10px;font-weight:900;}
.secura-user-neo .uad15__replacement-row:last-child{border-bottom:0;}
.secura-user-neo .uad15__replacement-row code{white-space:pre-wrap;overflow-wrap:anywhere;}
@keyframes uad15-wave{to{background-position:250% 50%;}}
@keyframes uad15-rotate{to{transform:rotate(360deg);}}
@keyframes uad15-load{to{left:120%;}}
@keyframes uad15-breath{50%{transform:scale(1.05);box-shadow:0 0 46px rgba(149,110,241,.37);}}
@keyframes uad15-pop{0%{opacity:0;transform:scale(.68);}100%{opacity:1;transform:scale(1);}}
@media (max-width:1150px){
 .secura-user-neo .uad15__main-grid,.secura-user-neo .uad15__results-grid{grid-template-columns:1fr;}
 .secura-user-neo .uad15__drop{min-height:245px;}
}
@media (max-width:760px){
 .secura-user-neo .uad15__topbar-name{font-size:9px;}
 .secura-user-neo .uad15__topbar .sun15__today{display:none;}
 .secura-user-neo .uad15__workspace-main{padding:15px 12px 24px;}
 .secura-user-neo .uad15__page-head{align-items:flex-start;flex-direction:column;min-height:0;padding:22px;}
 .secura-user-neo .uad15__page-head h1{font-size:32px;}
 .secura-user-neo .uad15__progress{gap:6px;}
 .secura-user-neo .uad15__stage{flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:5px;padding:9px 4px;}
 .secura-user-neo .uad15__stage-icon{width:31px;height:31px;}
 .secura-user-neo .uad15__stage-copy b{font-size:10px;}
 .secura-user-neo .uad15__stage-copy small,.secura-user-neo .uad15__stage-chevron{display:none;}
 .secura-user-neo .uad15__complete-hero{flex-wrap:wrap;padding:17px;}
 .secura-user-neo .uad15__complete-hero .uad15__download{width:100%;}
 .secura-user-neo .uad15__card{padding:18px;}
}
@media (max-width:420px){
 .secura-user-neo .uad15__topbar-name{font-size:0;}
 .secura-user-neo .uad15__profile-link{font-size:10px;padding:8px;}
 .secura-user-neo .uad15__page-head h1{font-size:29px;}
 .secura-user-neo .uad15__drop{min-height:245px;}
 .secura-user-neo .uad15__file-bottom{flex-wrap:wrap;}
 .secura-user-neo .uad15__file-summary{flex:1 1 100%;}
}
@media (prefers-reduced-motion:reduce){
 .secura-user-neo .uad15__page *, .secura-user-neo .uad15__page *::before,.secura-user-neo .uad15__page *::after{
   animation:none!important;transition-duration:.01ms!important;scroll-behavior:auto!important;
 }
}
/* ================================================================
   SECURA V15.4.3 — Step 02 AI Protection micro-interactions
   Calm when ready; purposeful motion only while processing.
   Transform + opacity first; no fake percentage or timer-based status.
   ================================================================= */
/* File validated: gentle orbital movement to make readiness apparent. */
.secura-user-neo .uad15__ai-visual.is-ready:not(.is-active) .uad15__ai-ring.one {
  border-style: solid;
  animation: uad1543-ready-ring 6s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-ready:not(.is-active) .uad15__ai-center {
  animation: uad1543-ready-shield 3.8s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-ready:not(.is-active) .uad15__orbit-dot.dot-a {
  animation: uad1543-orbit-dot-a 4.1s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-ready:not(.is-active) .uad15__orbit-dot.dot-b {
  animation: uad1543-orbit-dot-b 4.9s ease-in-out infinite .45s;
}
/* Backend processing: stronger but still unobtrusive loop on the illustration. */
.secura-user-neo .uad15__ai-visual.is-active .uad15__ai-ring.one {
  border: 2px dashed rgba(168, 127, 247, .75);
  animation: uad15-rotate 3.8s linear infinite;
}
.secura-user-neo .uad15__ai-visual.is-active .uad15__ai-ring.two {
  border: 1px dashed rgba(113, 209, 220, .7);
  animation: uad1543-counter-rotate 5s linear infinite;
}
.secura-user-neo .uad15__ai-visual.is-active .uad15__ai-center {
  animation: uad1543-processing-pulse 2.25s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-active .uad15__orbit-dot.dot-a {
  animation: uad1543-orbit-dot-a 1.75s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-active .uad15__orbit-dot.dot-b {
  animation: uad1543-orbit-dot-b 2.15s ease-in-out infinite .2s;
}
/* Gentle recognition cue on the current 02 / Protect stage. */
.secura-user-neo .uad15__progress .uad15__stage:nth-child(2).is-current .uad15__stage-icon {
  animation: uad1543-stage-cue 3s ease-in-out infinite;
}
/* Status copy appears only when backend is actually processing. */
.secura-user-neo .uad15__process-card:has(.uad15__ai-visual.is-active) .uad15__ai-copy {
  position: relative;
}
.secura-user-neo .uad15__process-card:has(.uad15__ai-visual.is-active) .uad15__ai-copy::after {
  content: '';
  display: block;
  height: 2px;
  width: 84px;
  margin: 13px auto 0;
  border-radius: 4px;
  background: linear-gradient(90deg, transparent, #9d83ed, #5fcbc8, transparent);
  animation: uad1543-scan-line 1.8s ease-in-out infinite;
  transform-origin: center;
}
@keyframes uad1543-ready-ring {
  0%, 100% { opacity: .50; transform: scale(.98); }
  50% { opacity: .95; transform: scale(1.035); }
}
@keyframes uad1543-ready-shield {
  0%, 100% { transform: translateY(0); box-shadow: 0 0 28px rgba(145,103,237,.19), inset 0 0 0 5px rgba(255,255,255,.025); }
  50% { transform: translateY(-3px); box-shadow: 0 0 39px rgba(145,103,237,.30), inset 0 0 0 5px rgba(255,255,255,.025); }
}
@keyframes uad1543-orbit-dot-a {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: .75; }
  50% { transform: translate(9px, -8px) scale(1.18); opacity: 1; }
}
@keyframes uad1543-orbit-dot-b {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: .80; }
  50% { transform: translate(-10px, 8px) scale(1.16); opacity: 1; }
}
@keyframes uad1543-counter-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
@keyframes uad1543-processing-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 28px rgba(145,103,237,.22), inset 0 0 0 5px rgba(255,255,255,.025); }
  50% { transform: scale(1.075); box-shadow: 0 0 47px rgba(151,114,247,.42), inset 0 0 0 5px rgba(255,255,255,.025); }
}
@keyframes uad1543-stage-cue {
  0%, 100% { box-shadow: 0 0 0 0 rgba(165,111,236,0); }
  50% { box-shadow: 0 0 0 4px rgba(165,111,236,.13); }
}
@keyframes uad1543-scan-line {
  0%, 100% { transform: scaleX(.35); opacity: .45; }
  50% { transform: scaleX(1); opacity: 1; }
}
/* SECURA V15.4.4 — Step 02 gentle ambient animation BEFORE a file is selected.
   Idle conveys readiness only: no progress indicator or fake "scanning" while waiting.
   The existing Ready and Processing states remain independent. */
.secura-user-neo .uad15__ai-visual.is-idle::before {
  content: "";
  position: absolute;
  inset: 12px;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(153, 111, 240, .18) 0%, rgba(112, 205, 215, .06) 38%, transparent 75%);
  animation: uad1544-idle-halo 5.8s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-idle .uad15__ai-ring.one {
  border-color: rgba(162, 132, 240, .48);
  animation: uad1544-idle-breathe 6s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-idle .uad15__ai-ring.two {
  border-color: rgba(145, 115, 233, .45);
  animation: uad1544-idle-spin 17s linear infinite;
}
.secura-user-neo .uad15__ai-visual.is-idle .uad15__ai-center {
  animation: uad1544-idle-float 4.4s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-idle .uad15__orbit-dot.dot-a {
  animation: uad1544-idle-dot-a 7s ease-in-out infinite;
}
.secura-user-neo .uad15__ai-visual.is-idle .uad15__orbit-dot.dot-b {
  animation: uad1544-idle-dot-b 7.9s ease-in-out infinite -.8s;
}
/* The ready-to-start state also keeps the inner orbit moving gently before AI begins. */
.secura-user-neo .uad15__ai-visual.is-ready:not(.is-active) .uad15__ai-ring.two {
  animation: uad1544-idle-spin 12s linear infinite;
}
@keyframes uad1544-idle-halo {
  0%,100% { transform: scale(.93); opacity: .35; }
  50% { transform: scale(1.12); opacity: .9; }
}
@keyframes uad1544-idle-breathe {
  0%,100% { transform: scale(.98); opacity: .42; }
  50% { transform: scale(1.045); opacity: .85; }
}
@keyframes uad1544-idle-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes uad1544-idle-float {
  0%,100% { transform: translate3d(0,0,0); }
  50% { transform: translate3d(0,-5px,0); }
}
@keyframes uad1544-idle-dot-a {
  0%,100% { transform: translate3d(0,0,0) scale(.9); opacity: .62; }
  50% { transform: translate3d(7px,-11px,0) scale(1.15); opacity: 1; }
}
@keyframes uad1544-idle-dot-b {
  0%,100% { transform: translate3d(0,0,0) scale(.9); opacity: .62; }
  50% { transform: translate3d(-9px,10px,0) scale(1.15); opacity: 1; }
}
/* The existing prefers-reduced-motion:reduce !important rule also turns these off. */

/* Existing reduced-motion rule above disables ALL these keyframes. */
/* Like the approved User Dashboard: scrolling works, chrome is hidden. */
html:has(.uad15__page), body:has(.uad15__page){scrollbar-width:none;}
html:has(.uad15__page)::-webkit-scrollbar,body:has(.uad15__page)::-webkit-scrollbar{display:none;width:0;}

/* SECURA V15.7: server-confirmed milestone progress, no decorative fake percentages. */
.secura-user-neo .uad157__checkpoint {margin:16px 0 10px;padding:14px 16px;border-radius:13px;border:1px solid rgba(160,128,244,.34);background:rgba(136,103,217,.07);}
.secura-user-neo .uad157__checkpoint-head {display:flex;justify-content:space-between;gap:12px;align-items:center;color:var(--sun-text);font-size:11px;font-weight:700;}
.secura-user-neo .uad157__checkpoint-head span {line-height:1.55;}
.secura-user-neo .uad157__checkpoint-head strong {font-size:17px;font-weight:900;color:#bb8aff;font-variant-numeric:tabular-nums;white-space:nowrap;}
.secura-user-neo .uad157__checkpoint-track {height:7px;overflow:hidden;border-radius:99px;background:rgba(151,136,203,.18);margin:10px 0 8px;}
.secura-user-neo .uad157__checkpoint-track > span {display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6a89ff,#a45af1,#63dbce);transition:width .55s cubic-bezier(.22,.75,.28,1);}
.secura-user-neo .uad157__checkpoint > small {font-size:10px;line-height:1.4;color:var(--sun-muted);display:block;}
@media(prefers-reduced-motion:reduce) { .secura-user-neo .uad157__checkpoint-track > span {transition:none!important;} }

/* V15.8 - Muted cancel action, confirmation overlay and cancellation UX. */
.secura-user-neo .uad158__cancel-button{display:flex;justify-content:center;align-items:center;gap:7px;margin:10px auto 0;padding:9px 13px;background:transparent;border:1px solid transparent;border-radius:10px;color:var(--sun-muted);font-size:11px;font-weight:750;transition:color .18s,border-color .18s,background .18s;}
.secura-user-neo .uad158__cancel-button:hover:not(:disabled){color:#e996a7;border-color:rgba(224,115,140,.29);background:rgba(218,104,132,.07);}
.secura-user-neo .uad158__cancel-pending{margin:10px 0 0;color:var(--sun-muted);text-align:center;font-size:11px;line-height:1.65;}
.secura-user-neo .uad158__confirm{width:min(440px,100%);padding:23px;}
.secura-user-neo .uad158__confirm h2{margin:3px 0 12px;font-size:19px;line-height:1.35;letter-spacing:-.03em;}
.secura-user-neo .uad158__confirm p{font-size:12px;line-height:1.65;color:var(--sun-muted);}
.secura-user-neo .uad158__confirm-icon{height:43px;width:43px;display:grid;place-items:center;border-radius:13px;background:rgba(224,122,143,.12);color:#e996a7;margin-bottom:14px;}
.secura-user-neo .uad158__confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;flex-wrap:wrap;}
.secura-user-neo .uad158__confirm-actions button{border-radius:10px;min-height:40px;padding:10px 13px;font-size:11px;font-weight:800;}
.secura-user-neo .uad158__confirm-no{border:1px solid var(--sun-line);background:var(--sun-field);color:var(--sun-text);}
.secura-user-neo .uad158__confirm-yes{border:1px solid rgba(216,121,141,.36);background:rgba(218,104,132,.13);color:#e18ca1;}
.secura-user-neo .uad158__confirm-yes:hover:not(:disabled){background:rgba(218,104,132,.21);}
.secura-user-neo .uad158__confirm button:disabled{opacity:.58;cursor:wait;}
`

function AnonymizeDocument() {
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedDocument, setUploadedDocument] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [anonymizing, setAnonymizing] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [jobPercent, setJobPercent] = useState(0)
  const [jobStage, setJobStage] = useState('Queued')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [restoringJob, setRestoringJob] = useState(true)
  const [loadingReplacements, setLoadingReplacements] = useState(false)
  const userStartedNewFile = useRef(false)
  const [dragActive, setDragActive] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [departments, setDepartments] = useState([])
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([])
  const [sharedDepartmentIds, setSharedDepartmentIds] = useState([])
  const [showShare, setShowShare] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showReplacements, setShowReplacements] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Only reset after the server acknowledges CANCELLED. Navigating or clicking
  // a button never pretends to stop a running CPU-bound AI stage.
  const clearCancelledJob = useCallback(() => {
    userStartedNewFile.current = true
    setJobId(null)
    setJobStatus(null)
    setJobPercent(0)
    setJobStage('Queued')
    setSelectedFile(null)
    setUploadedDocument(null)
    setUploading(false)
    setAnonymizing(false)
    setResult(null)
    setSelectedDepartmentIds([])
    setSharedDepartmentIds([])
    setShowShare(false)
    setShowReport(false)
    setShowReplacements(false)
    setShowCancelConfirm(false)
    setCancelling(false)
    setError('')
    setMessage('Anonymization cancelled. You can upload another document.')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get('/departments').then((response) => {
      if (!cancelled) setDepartments(Array.isArray(response.data) ? response.data : [])
    }).catch(() => { if (!cancelled) setDepartments([]) })
    return () => { cancelled = true }
  }, [])

  // Recover the newest server-side job whenever this page is revisited. No PII
  // is stored in localStorage; the server always enforces document ownership.
  useEffect(() => {
    let cancelled = false
    api.get('/anonymization-jobs/recent').then(({ data }) => {
      if (cancelled || userStartedNewFile.current) return
      const job = Array.isArray(data)
        ? (data.find((item) => ['QUEUED', 'PROCESSING', 'CANCEL_REQUESTED'].includes(item.status)) || (data[0]?.status === 'CANCELLED' ? null : data[0]))
        : null
      if (!job) return
      setJobId(job.job_id)
      setJobStatus(job.status)
      setJobPercent(Number(job.progress_percent ?? 0))
      setJobStage(job.progress_stage || 'Queued')
      setUploadedDocument({ id: job.document_id, original_filename: job.filename, file_size: job.file_size })
      setAnonymizing(['QUEUED', 'PROCESSING', 'CANCEL_REQUESTED'].includes(job.status))
      if (job.status === 'COMPLETED' && job.anonymized_ready) {
        setResult({ document_id: job.document_id, filename: job.filename,
          pii_count: job.pii_count, pii_counts: job.pii_counts,
          replacement_count: job.replacement_count, replacements: null })
      }
      if (job.status === 'FAILED') setError(job.error || 'This process was interrupted. You can retry it.')
    }).catch(() => {
      if (!cancelled) setError('Unable to check your saved AI processing jobs. Try refreshing the page.')
    }).finally(() => { if (!cancelled) setRestoringJob(false) })
    return () => { cancelled = true }
  }, [])

  // The task continues on the server when this component unmounts.
  useEffect(() => {
    if (!jobId || !anonymizing) return undefined
    let cancelled = false
    const check = async () => {
      try {
        const { data: job } = await api.get(`/anonymization-jobs/${jobId}`)
        if (cancelled) return
        setJobStatus(job.status)
        setJobPercent(Number(job.progress_percent ?? 0))
        setJobStage(job.progress_stage || 'Queued')
        if (job.status === 'CANCELLED') {
          clearCancelledJob()
          return
        }
        if (job.status === 'COMPLETED' && job.anonymized_ready) {
          setResult({ document_id: job.document_id, filename: job.filename,
            pii_count: job.pii_count, pii_counts: job.pii_counts,
            replacement_count: job.replacement_count, replacements: null })
          setAnonymizing(false)
          setMessage('AI protection finished. Your anonymized file is ready.')
        } else if (job.status === 'FAILED') {
          setAnonymizing(false)
          setError(job.error || 'AI processing failed. Please retry the document.')
        }
      } catch (pollError) {
        if (!cancelled && pollError?.response?.status === 401) {
          setAnonymizing(false)
          setError('Session expired. Sign in to view the saved processing job.')
        }
      }
    }
    const interval = window.setInterval(() => { void check() }, 2500)
    void check()
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [jobId, anonymizing, clearCancelledJob])

  // Restore department sharing when revisiting an already protected document.
  useEffect(() => {
    if (!result?.document_id) return undefined
    let cancelled = false
    api.get(`/document-library/${result.document_id}/shares`).then(({ data }) => {
      if (!cancelled && Array.isArray(data)) {
        setSharedDepartmentIds(data.map((item) => item.department_id))
      }
    }).catch(() => { /* Sharing controls still work if the list cannot be fetched. */ })
    return () => { cancelled = true }
  }, [result?.document_id])

  useEffect(() => {
    if (!showCancelConfirm || cancelling) return undefined
    const close = (event) => {
      if (event.key === 'Escape') setShowCancelConfirm(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [showCancelConfirm, cancelling])

  useEffect(() => {
    if (!showReplacements) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowReplacements(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showReplacements])

  const resetWorkflow = () => {
    setShowCancelConfirm(false)
    setCancelling(false)
    userStartedNewFile.current = true
    setJobId(null)
    setJobStatus(null)
    setJobPercent(0)
    setJobStage('Queued')
    setSelectedFile(null)
    setUploadedDocument(null)
    setUploading(false)
    setAnonymizing(false)
    setDragActive(false)
    setResult(null)
    setError('')
    setMessage('')
    setSelectedDepartmentIds([])
    setSharedDepartmentIds([])
    setShowShare(false)
    setShowReport(false)
    setShowReplacements(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadFile = async (file) => {
    if (!file || uploading || anonymizing || sharing) return
    userStartedNewFile.current = true
    setJobId(null)
    setJobStatus(null)
    setJobPercent(0)
    setJobStage('Queued')
    setError('')
    setMessage('')
    setResult(null)
    setUploadedDocument(null)
    setSelectedDepartmentIds([])
    setSharedDepartmentIds([])
    setShowShare(false)
    setShowReport(false)
    setShowReplacements(false)
    const ext = getExtension(file.name)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setSelectedFile(null)
      setError('Unsupported file type. Please upload PDF, DOCX, TXT, XLSX or CSV.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null)
      setError('This document is larger than the 25 MB upload limit.')
      return
    }
    if (file.size === 0) {
      setSelectedFile(null)
      setError('The selected document is empty.')
      return
    }
    setSelectedFile(file)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/documents/upload', formData)
      setUploadedDocument(response.data)
    } catch (uploadError) {
      setSelectedFile(null)
      setError(errorMessage(uploadError, 'Unable to upload and validate this document.'))
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // Allows selecting the same file again after a failed attempt.
    if (file) void uploadFile(file)
  }
  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void uploadFile(file)
  }
  const handleAnonymize = async () => {
    if (!uploadedDocument?.id || uploading || anonymizing) return
    userStartedNewFile.current = true
    setError('')
    setMessage('')
    setAnonymizing(true)
    setJobStatus('QUEUED')
    setJobPercent(0)
    setJobStage('Queued')
    try {
      const { data: job } = await api.post('/anonymization-jobs', {
        document_id: uploadedDocument.id,
      })
      setJobId(job.job_id)
      setJobStatus(job.status)
      setJobPercent(Number(job.progress_percent ?? 0))
      setJobStage(job.progress_stage || 'Queued')
      if (job.status === 'COMPLETED' && job.anonymized_ready) {
        setResult({ document_id: job.document_id, filename: job.filename,
          pii_count: job.pii_count, pii_counts: job.pii_counts,
          replacement_count: job.replacement_count, replacements: null })
        setAnonymizing(false)
      } else if (job.status === 'FAILED') {
        setAnonymizing(false)
        setError(job.error || 'Anonymization could not be completed.')
      } else {
        setMessage('AI is running on the server. You can visit other SECURA pages and return later.')
      }
    } catch (processError) {
      setAnonymizing(false)
      setJobStatus(null)
    setJobPercent(0)
    setJobStage('Queued')
      setError(errorMessage(processError, 'Unable to start AI anonymization.'))
    }
  }

  const handleConfirmCancel = async () => {
    if (!jobId || cancelling) return
    setCancelling(true)
    setError('')
    try {
      const { data: job } = await api.post(`/anonymization-jobs/${jobId}/cancel`)
      setShowCancelConfirm(false)
      if (job.status === 'CANCELLED') {
        clearCancelledJob()
      } else if (job.status === 'CANCEL_REQUESTED') {
        setJobStatus('CANCEL_REQUESTED')
        setJobStage(job.progress_stage || 'Cancellation requested')
        setMessage('Cancellation requested. The server will finish its current AI stage and then stop safely.')
      } else {
        setError('Server did not confirm cancellation. Please check the job status.')
      }
    } catch (cancelError) {
      setShowCancelConfirm(false)
      if (cancelError?.response?.status === 409) {
        setError('The job may already have finished. SECURA will check the latest status before allowing another action.')
      } else {
        setError(errorMessage(cancelError, 'Could not cancel this process. It may still be running. Please try again.'))
      }
    } finally {
      setCancelling(false)
    }
  }

  const openReplacements = async () => {
    if (!jobId || loadingReplacements) return
    setLoadingReplacements(true)
    setError('')
    try {
      const { data } = await api.get(`/anonymization-jobs/${jobId}/replacements`)
      setResult((previous) => previous && ({ ...previous, replacements: data.replacements }))
      setShowReplacements(true)
    } catch (reportError) {
      setError(errorMessage(reportError, 'Could not open the encrypted Before / After report.'))
    } finally {
      setLoadingReplacements(false)
    }
  }
  const handleDownload = async () => {
    if (!result?.document_id || downloading) return
    setDownloading(true)
    setError('')
    try {
      const response = await api.get(`/document-library/${result.document_id}/download-anonymized`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `anonymized_${result.filename || uploadedDocument?.original_filename || selectedFile?.name || 'document'}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('Your anonymized file has been downloaded.')
    } catch (downloadError) {
      setError(errorMessage(downloadError, 'Unable to download the anonymized document.'))
    } finally {
      setDownloading(false)
    }
  }
  const toggleDepartment = (id) => {
    if (sharedDepartmentIds.includes(id)) return
    setSelectedDepartmentIds((list) => list.includes(id) ? list.filter((current) => current !== id) : [...list, id])
  }
  const handleShare = async () => {
    const pending = selectedDepartmentIds.filter((id) => !sharedDepartmentIds.includes(id))
    if (!result?.document_id || !pending.length || sharing) return
    setSharing(true)
    setError('')
    setMessage('')
    try {
      const requests = pending.map(async (departmentId) => {
        await api.post(`/document-library/${result.document_id}/share`, { department_id: departmentId })
        return departmentId
      })
      const responses = await Promise.allSettled(requests)
      const successfulIds = responses.filter((res) => res.status === 'fulfilled').map((res) => res.value)
      const failedCount = responses.length - successfulIds.length
      setSharedDepartmentIds((list) => [...new Set([...list, ...successfulIds])])
      setSelectedDepartmentIds((list) => list.filter((id) => !successfulIds.includes(id)))
      if (failedCount) setError(`${failedCount} department share request(s) could not be completed.`)
      else {
        setShowShare(false)
        setMessage('Anonymized document shared with the selected department(s).')
      }
    } finally {
      setSharing(false)
    }
  }

  const piiRows = Object.entries(result?.pii_counts ?? {}).map(([type, count]) => ({
    type, label: PII_LABELS[type] ?? type, count,
  }))
  const totalProtected = Number(result?.pii_count ?? 0)
  const phase = result ? 3 : anonymizing ? 2 : uploadedDocument ? 2 : 1
  const busy = uploading || anonymizing || sharing || restoringJob
  const selectedDepartmentNames = departments.filter((d) => selectedDepartmentIds.includes(d.id)).map((d) => d.name)

  return (
    <section className="uad15__page">
      <style>{SECURA_ANONYMIZE_STYLES}</style>
      <div className="uad15__page-head">
        <div><span className="uad15__eyebrow"><Sparkles size={14} /> YOUR DOCUMENT WORKSPACE</span>
          <h1>Protect a document<span>.</span></h1>
          <p>Upload a file, let SECURA anonymize sensitive information, then safely download or share it.</p>
        </div>
        <span className="uad15__head-glow" aria-hidden="true" />
      </div>

      <div className="uad15__progress" aria-label="Anonymization progress">
        {[
          { n: 1, title: 'Upload', sub: 'Choose your document', Icon: FileUp },
          { n: 2, title: 'Protect', sub: 'Run AI anonymization', Icon: Sparkles },
          { n: 3, title: 'Finish', sub: 'Download or share', Icon: FileCheck2 },
        ].map(({ n, title, sub, Icon }) => (
          <div key={n} className={`uad15__stage ${phase === n ? 'is-current' : ''} ${phase > n ? 'is-done' : ''}`}>
            <span className="uad15__stage-icon">{phase > n ? <Check size={18} /> : <Icon size={19} />}</span>
            <span className="uad15__stage-copy"><b>{title}</b><small>{sub}</small></span>
            {n < 3 && <ChevronRight size={17} className="uad15__stage-chevron" />}
          </div>
        ))}
      </div>

      {restoringJob && <div className="uad15__notice" role="status">
        <Info size={17}/><span>Checking your saved AI processing session…</span></div>}
      {error && <div className="uad15__notice is-error" role="alert"><Info size={17}/><span>{error}</span>
        <button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
      {message && <div className="uad15__notice is-success" role="status"><CheckCircle2 size={17}/><span>{message}</span>
        <button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16}/></button></div>}

      {!result ? (
        <div className="uad15__main-grid">
          <section className="uad15__card uad15__upload-card">
            <div className="uad15__card-heading"><span className="uad15__icon is-blue"><FileUp size={21}/></span>
              <div><span className="uad15__overline">STEP 01 / SELECT FILE</span><h2>Choose a document</h2>
                <p>Start with a file you want to protect before sharing.</p></div></div>
            <input ref={fileInputRef} type="file" className="uad15__hidden-file"
              accept=".pdf,.docx,.txt,.xlsx,.csv" onChange={handleFileInput} />
            <button type="button" className={`uad15__drop ${dragActive ? 'is-dragged' : ''} ${uploadedDocument ? 'is-uploaded' : ''}`}
              disabled={busy} onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
              onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
              onDragLeave={(event) => { event.preventDefault(); setDragActive(false) }}
              onDrop={handleDrop}>
              <span className="uad15__drop-art" aria-hidden="true"><FileText size={32}/><span><UploadCloud size={24}/></span></span>
              <b>{uploading ? 'Uploading securely…' : uploadedDocument ? 'Document uploaded successfully' : 'Drag and drop your file here'}</b>
              <span>{selectedFile?.name || uploadedDocument?.original_filename || 'or click to browse files on your device'}</span>
              <em>{uploading ? 'SECURA is validating your document' : 'PDF · DOCX · TXT · XLSX · CSV · Max 25 MB'}</em>
              {uploading && <span className="uad15__busy-line" aria-label="Uploading" />}
            </button>
            <div className="uad15__file-bottom">
              <div className="uad15__file-summary">
                <span className={`uad15__file-symbol ${uploadedDocument ? 'is-ready' : ''}`}><FileText size={20}/></span>
                <span><b>{uploadedDocument?.original_filename || selectedFile?.name || 'No file selected yet'}</b>
                  <small>{uploadedDocument ? `${formatBytes(uploadedDocument.file_size)} · Validated and stored securely` : 'Your file stays private while it is processed.'}</small></span>
                {uploadedDocument && <CheckCircle2 size={20} className="uad15__valid" />}
              </div>
              {uploadedDocument && <button className="uad15__change" type="button" disabled={busy}
                onClick={() => fileInputRef.current?.click()}>Choose another file</button>}
            </div>
          </section>

          <section className="uad15__card uad15__process-card">
            <div className="uad15__card-heading"><span className="uad15__icon is-purple"><Sparkles size={21}/></span>
              <div><span className="uad15__overline">STEP 02 / AI PROTECTION</span><h2>Protect sensitive details</h2>
                <p>SECURA detects supported personal information and anonymizes it.</p></div></div>
            <div className={`uad15__ai-visual ${anonymizing ? 'is-active' : uploadedDocument ? 'is-ready' : 'is-idle'}`}>
              <span className="uad15__ai-ring one"/><span className="uad15__ai-ring two"/>
              <span className="uad15__ai-center"><ShieldCheck size={39}/></span>
              <span className="uad15__orbit-dot dot-a"/><span className="uad15__orbit-dot dot-b"/>
            </div>
            <div className="uad15__ai-copy" aria-live="polite">
              <b>{anonymizing ? (jobStatus === 'CANCEL_REQUESTED' ? 'Stopping AI anonymization safely' : jobStatus === 'QUEUED' ? 'AI processing queued securely' : 'AI anonymization in progress') : uploadedDocument ? 'Your document is ready for AI protection' : 'Ready when you are'}</b>
              <p>{anonymizing ? (jobStatus === 'CANCEL_REQUESTED' ? 'Cancellation is pending. Your original upload remains protected.' : 'You can safely open other pages. SECURA will keep processing on the server.') : uploadedDocument ? 'Your upload passed validation. Start AI anonymization when ready.' : 'Once you upload a document, you can start the privacy protection process.'}</p>
            </div>
            {anonymizing && (
              <div className="uad157__checkpoint" role="progressbar"
                aria-label="AI workflow checkpoint progress"
                aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={Math.max(0, Math.min(100, jobPercent))}
                aria-valuetext={`${jobStage} — ${jobPercent}% of workflow checkpoints`}>
                <div className="uad157__checkpoint-head">
                  <span>{jobStage}</span><strong>{jobPercent}%</strong>
                </div>
                <div className="uad157__checkpoint-track" aria-hidden="true">
                  <span style={{ width: `${Math.max(0, Math.min(100, jobPercent))}%` }} />
                </div>
                <small>Completed workflow stages · may pause during AI analysis</small>
              </div>
            )}
            <div className="uad15__protection-list">
              <span><Check size={14}/> File validation</span>
              <span><LockKeyhole size={14}/> Original-file protection</span>
              <span><SearchCheck size={14}/> Sensitive data detection</span>
            </div>
            <button type="button" className="uad15__primary" disabled={!uploadedDocument || uploading || anonymizing || restoringJob}
              onClick={handleAnonymize}>
              {anonymizing ? <span className="uad15__spinner"/> : <Sparkles size={18}/>} 
              {anonymizing ? (jobStatus === 'CANCEL_REQUESTED' ? 'Stopping safely…' : jobStatus === 'QUEUED' ? 'Waiting for AI worker…' : 'Anonymizing securely…') : jobStatus === 'FAILED' ? 'Retry anonymization' : 'Anonymize with AI'}
              {!anonymizing && <ArrowRight size={18}/>}
            </button>
            {anonymizing && jobId && jobStatus !== 'CANCEL_REQUESTED' && (
              <button type="button" className="uad158__cancel-button"
                onClick={() => setShowCancelConfirm(true)}>
                <X size={14} /> Cancel process
              </button>
            )}
            {anonymizing && jobStatus === 'CANCEL_REQUESTED' && (
              <p className="uad158__cancel-pending" role="status">Cancellation requested · Waiting for a safe stopping point</p>
            )}
          </section>
        </div>
      ) : (
        <div className="uad15__result-stack">
          <section className="uad15__complete-hero">
            <span className="uad15__complete-icon"><CheckCircle2 size={32}/></span>
            <div><span className="uad15__overline">DOCUMENT PROTECTED</span><h2>Your anonymized file is ready</h2>
              <p>{`anonymized_${result.filename || selectedFile?.name || 'document'}`}</p></div>
            <button type="button" className="uad15__download" onClick={handleDownload} disabled={downloading}>
              <Download size={18}/>{downloading ? 'Downloading…' : 'Download file'}</button>
          </section>
          <div className="uad15__results-grid">
            <section className="uad15__card uad15__result-report">
              <div className="uad15__card-heading"><span className="uad15__icon is-green"><ShieldCheck size={21}/></span>
                <div><span className="uad15__overline">AI DETECTION REPORT</span><h2>What SECURA protected</h2>
                  <p>Anonymization completed for your current file.</p></div></div>
              <div className="uad15__count"><strong>{totalProtected}</strong><span>Sensitive data point{totalProtected === 1 ? '' : 's'} protected</span></div>
              <div className="uad15__pii-list">
                {piiRows.length ? piiRows.map(({ type, label, count }) => (
                  <div key={type}><span>{label}</span><b>{count}</b></div>
                )) : <div><span>No supported PII categories detected</span><b>0</b></div>}
              </div>
              <button type="button" className="uad15__secondary uad15__wide" onClick={() => setShowReport((value) => !value)}
                aria-expanded={showReport}>{showReport ? 'Hide detection details' : 'View detection details'}
                {showReport ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
              {showReport && <div className="uad15__report-details">
                <b>Processing summary</b><span>File validated, AI anonymization completed, and protected copy generated.</span>
                {result.replacement_count > 0 &&
                  <button type="button" disabled={loadingReplacements} onClick={() => void openReplacements()}>
                    {loadingReplacements ? 'Opening encrypted report…' : 'View Before / After'} <ArrowRight size={15}/></button>}
              </div>}
            </section>
            <section className="uad15__card uad15__share-panel">
              <div className="uad15__card-heading"><span className="uad15__icon is-purple"><Share2 size={21}/></span>
                <div><span className="uad15__overline">NEXT STEP / CONTROL ACCESS</span><h2>Share safely</h2>
                  <p>Choose which departments can access the anonymized copy.</p></div></div>
              <div className="uad15__shared-state"><ShieldCheck size={20}/>
                <span><b>{sharedDepartmentIds.length ? `Shared with ${sharedDepartmentIds.length} department(s)` : 'Only you control sharing'}</b>
                  <small>The original file remains protected behind the approval workflow.</small></span></div>
              <button type="button" className="uad15__secondary uad15__wide" onClick={() => setShowShare((value) => !value)}
                aria-expanded={showShare}><Share2 size={17}/>{showShare ? 'Close department sharing' : 'Share with a department'}
                {showShare ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
              {showShare && <div className="uad15__share-options">
                <p>Select the departments allowed to use this anonymized file:</p>
                {departments.length ? departments.map((department) => {
                  const shared = sharedDepartmentIds.includes(department.id)
                  return <label key={department.id} className={shared ? 'is-shared' : ''}>
                    <input type="checkbox" disabled={shared} checked={shared || selectedDepartmentIds.includes(department.id)}
                      onChange={() => toggleDepartment(department.id)}/>
                    <span>{department.name}</span>{shared && <small>Shared</small>}
                  </label>
                }) : <p>No departments are currently available.</p>}
                <small>{selectedDepartmentNames.length ? `Selected: ${selectedDepartmentNames.join(', ')}` : 'No new departments selected'}</small>
                <button type="button" className="uad15__primary" onClick={handleShare}
                  disabled={sharing || selectedDepartmentIds.length === 0}>
                  {sharing ? 'Sharing…' : 'Share anonymized file'} <ArrowRight size={16}/>
                </button>
              </div>}
              <button type="button" className="uad15__restart" onClick={resetWorkflow} disabled={sharing || downloading}><RotateCcw size={16}/> Protect another document</button>
            </section>
          </div>
        </div>
      )}

      <footer className="uad15__footer"><LockKeyhole size={17}/><span>Every upload is validated and the original is protected. Original-file access requires the SECURA approval process.</span></footer>

      {showCancelConfirm && anonymizing && jobId && (
        <div className="uad15__modal-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !cancelling) setShowCancelConfirm(false) }}>
          <section className="uad15__modal uad158__confirm" role="alertdialog" aria-modal="true"
            aria-labelledby="uad158-cancel-title" aria-describedby="uad158-cancel-desc">
            <span className="uad158__confirm-icon"><X size={22} aria-hidden="true" /></span>
            <h2 id="uad158-cancel-title">Cancel AI anonymization?</h2>
            <p id="uad158-cancel-desc">Are you sure you want to cancel the AI anonymization process? SECURA will stop at the next safe stage. Your uploaded original remains encrypted.</p>
            <div className="uad158__confirm-actions">
              <button type="button" className="uad158__confirm-no" autoFocus
                disabled={cancelling} onClick={() => setShowCancelConfirm(false)}>No, continue</button>
              <button type="button" className="uad158__confirm-yes"
                disabled={cancelling} onClick={() => { void handleConfirmCancel() }}>
                {cancelling ? 'Requesting…' : 'Yes, cancel'}
              </button>
            </div>
          </section>
        </div>
      )}

      {showReplacements && result && (
        <div className="uad15__modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReplacements(false) }}>
          <section className="uad15__modal" role="dialog" aria-modal="true" aria-labelledby="uad15-modal-title">
            <div className="uad15__modal-title"><div><span className="uad15__overline">CURRENT ANONYMIZATION RUN</span>
              <h2 id="uad15-modal-title">Before / After replacements</h2></div>
              <button type="button" aria-label="Close dialog" onClick={() => setShowReplacements(false)}><X size={19}/></button></div>
            <p>Review how supported sensitive information was replaced in this file.</p>
            <div className="uad15__replacement-table"><div className="uad15__replacement-head"><span>Data type</span><span>Original</span><span>Protected replacement</span></div>
              {result.replacements.map((replacement, index) => (
                <div key={`${replacement.type}-${index}`} className="uad15__replacement-row">
                  <span>{PII_LABELS[replacement.type] ?? replacement.type}</span>
                  <code>{replacement.original}</code><code>{replacement.replacement}</code>
                </div>
              ))}</div>
            <button type="button" className="uad15__primary" onClick={() => setShowReplacements(false)}>Done <Check size={16}/></button>
          </section>
        </div>
      )}
    </section>
  )
}

export default AnonymizeDocument
