import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Building2,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Files,
  FileText,
  LockKeyhole,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  X,
  ArrowRight, ArrowDownUp, ChevronDown, ChevronRight, Filter, FolderOpen, LayoutGrid, List, LoaderCircle, Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import api from '../../api/client'

const SECURA_FILE_SPACE_CSS = String.raw`/* SECURA V15.5 – My File Space | intentionally scoped to User Library. */
.sfl15 {--fl-bg:#f9faff;--fl-card:#ffffff;--fl-card-alt:#f7f8ff;--fl-text:#1f2444;--fl-muted:#6b7599;--fl-border:#e4e7f3;--fl-stroke:rgba(107,99,190,.13);--fl-blue:#5b76ed;--fl-violet:#8d5af1;--fl-green:#149d7d;--fl-amber:#cb8a39;--fl-shadow:0 16px 35px rgba(47,48,102,.055);position:relative;color:var(--fl-text);font-family:inherit;width:100%;padding:26px clamp(20px,3vw,46px) 45px;min-width:0;box-sizing:border-box;}
html:not([data-theme="light"]) .sfl15 {--fl-bg:#0f1425;--fl-card:#1a2033;--fl-card-alt:#222b43;--fl-text:#f5f6ff;--fl-muted:#a3add2;--fl-border:#323c59;--fl-stroke:rgba(157,143,251,.22);--fl-blue:#89a5ff;--fl-violet:#b69aff;--fl-green:#64d8b8;--fl-amber:#f0bb75;--fl-shadow:0 20px 35px rgba(0,0,0,.13)}
.sfl15 *{box-sizing:border-box} .sfl15 button,.sfl15 input,.sfl15 select{font:inherit} .sfl15 button{cursor:pointer}.sfl15 button:disabled{cursor:not-allowed;opacity:.55}.sfl15 button:focus-visible,.sfl15 input:focus-visible,.sfl15 select:focus-visible{outline:3px solid rgba(148,117,248,.45);outline-offset:3px}.sfl15__label{display:flex;align-items:center;gap:7px;color:var(--fl-violet);font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
.sfl15__hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:168px;border-radius:23px;border:1px solid var(--fl-border);padding:28px clamp(24px,3.2vw,40px);overflow:hidden;background:linear-gradient(112deg,#e3efff,#f1eaff 58%,#e8deff);box-shadow:var(--fl-shadow);isolation:isolate}.sfl15__hero:before{content:'';position:absolute;pointer-events:none;inset:0;background:radial-gradient(circle at 85% 20%,rgba(128,99,220,.20),transparent 29%),repeating-linear-gradient(90deg,transparent 0,transparent 50px,rgba(113,102,212,.025) 51px,transparent 52px);z-index:-1}html:not([data-theme="light"]) .sfl15__hero{background:linear-gradient(110deg,#263754,#292749 60%,#443465);border-color:#434a79}.sfl15__hero h1{font-size:clamp(26px,3vw,41px);font-weight:900;letter-spacing:-.055em;margin:9px 0 10px;line-height:1.08}.sfl15__hero p{font-size:12px;color:var(--fl-muted);line-height:1.65;max-width:520px}html:not([data-theme="light"]) .sfl15__hero p{color:#c7cee9}.sfl15__hero-art{position:relative;display:grid;place-items:center;flex:0 0 126px;height:118px}.sfl15__hero-art>span{width:83px;height:83px;border-radius:24px;display:grid;place-items:center;color:white;background:linear-gradient(145deg,#6aa6ff,#976bf6);box-shadow:0 14px 33px rgba(102,96,237,.29);transform:rotate(-8deg);animation:sfl15Float 4.8s ease-in-out infinite}.sfl15__hero-art:before,.sfl15__hero-art:after{content:'';width:70px;height:88px;position:absolute;z-index:-1;border-radius:15px;background:rgba(255,255,255,.5);border:1px solid rgba(180,176,255,.35);transform:translate(26px,-12px) rotate(17deg)}.sfl15__hero-art:after{transform:translate(-24px,7px) rotate(-18deg);background:rgba(162,209,255,.32)}
.sfl15__hero-action{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(145,115,241,.34);background:rgba(255,255,255,.68);color:#594cb0;font-weight:800;font-size:11px;border-radius:12px;padding:11px 14px;margin-top:14px;transition:transform .18s,box-shadow .18s}html:not([data-theme="light"]) .sfl15__hero-action{background:rgba(255,255,255,.09);color:#eee8ff}.sfl15__hero-action:hover{transform:translateY(-2px);box-shadow:0 9px 20px rgba(125,96,200,.18)}
.sfl15__overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}.sfl15__space{display:flex;align-items:center;gap:12px;text-align:left;border:1px solid var(--fl-border);border-radius:18px;background:var(--fl-card);padding:17px 15px;min-height:84px;color:var(--fl-text);box-shadow:var(--fl-shadow);transition:transform .18s,border-color .18s,box-shadow .18s;position:relative;overflow:hidden}.sfl15__space:after{content:'';position:absolute;bottom:0;left:0;width:100%;height:3px;transform:scaleX(0);transform-origin:left;background:linear-gradient(90deg,#8c5cf6,#67c4ee);transition:transform .2s}.sfl15__space:hover{transform:translateY(-3px);border-color:rgba(151,113,242,.53)}.sfl15__space.is-active{border-color:rgba(140,94,246,.62);background:var(--fl-card-alt)}.sfl15__space.is-active:after{transform:scaleX(1)}.sfl15__space-icon{width:41px;height:41px;flex:0 0 41px;border-radius:13px;display:grid;place-items:center;background:rgba(92,151,245,.13);color:#5c91ed}.sfl15__space.is-own .sfl15__space-icon{background:rgba(149,104,242,.14);color:var(--fl-violet)}.sfl15__space.is-shared .sfl15__space-icon{background:rgba(25,168,143,.14);color:var(--fl-green)}.sfl15__space.is-archive .sfl15__space-icon{background:rgba(208,154,73,.13);color:var(--fl-amber)}.sfl15__space-text{display:grid;gap:3px;min-width:0}.sfl15__space-text b{font-size:14px;font-weight:900}.sfl15__space-text small{font-size:10px;color:var(--fl-muted);line-height:1.2}.sfl15__space-arrow{margin-left:auto;color:var(--fl-muted);flex:none}
.sfl15__main{display:grid;grid-template-columns:minmax(0,1.72fr) minmax(285px,.79fr);gap:16px;align-items:start;margin-top:16px}.sfl15__explorer,.sfl15__inspector{background:var(--fl-card);border:1px solid var(--fl-border);border-radius:21px;box-shadow:var(--fl-shadow);min-width:0;overflow:hidden}.sfl15__explorer-head{padding:22px 23px 17px;border-bottom:1px solid var(--fl-border)}.sfl15__explorer-title{display:flex;justify-content:space-between;align-items:center;gap:12px}.sfl15__explorer h2,.sfl15__inspector h2{font-size:19px;font-weight:900;letter-spacing:-.03em;margin:4px 0}.sfl15__explorer-title>span{font-size:10px;color:var(--fl-muted);text-align:right}.sfl15__toolbar{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px;align-items:center}.sfl15__search{display:flex;flex:1 1 205px;align-items:center;gap:10px;border:1px solid var(--fl-border);background:var(--fl-card-alt);border-radius:11px;padding:0 12px;min-width:0;height:42px;color:var(--fl-muted)}.sfl15__search input{flex:1;min-width:0;border:0!important;background:transparent!important;color:var(--fl-text)!important;font-size:11px!important;outline:none!important;box-shadow:none!important;padding:0!important;height:100%}.sfl15__search button{border:0;background:transparent;color:var(--fl-muted);display:grid;place-items:center}.sfl15__select-wrap{display:flex;gap:6px;align-items:center;border:1px solid var(--fl-border);border-radius:10px;background:var(--fl-card-alt);padding:0 10px;height:42px;color:var(--fl-muted)}.sfl15__select-wrap select{border:0!important;background:transparent!important;color:var(--fl-text)!important;font-size:10px!important;max-width:120px;outline:none;cursor:pointer}.sfl15__select-wrap select option{background:var(--fl-card);color:var(--fl-text)}.sfl15__view-switch{display:flex;align-items:center;border:1px solid var(--fl-border);padding:3px;gap:2px;border-radius:11px;background:var(--fl-card-alt);height:42px}.sfl15__view-switch button{border:0;border-radius:8px;display:grid;place-items:center;height:34px;width:35px;background:transparent;color:var(--fl-muted);transition:all .17s}.sfl15__view-switch button.is-on{background:rgba(139,101,245,.18);color:var(--fl-violet)}
.sfl15__file-area{padding:12px 13px 14px;min-height:410px;max-height:540px;overflow:auto;scrollbar-width:none}.sfl15__file-area::-webkit-scrollbar{display:none}.sfl15__file-list{display:grid;gap:7px}.sfl15__file-row{border:1px solid transparent;border-radius:13px;display:flex;align-items:center;gap:6px;padding:4px 6px;color:var(--fl-text);background:transparent;transition:border-color .18s,background .18s,transform .18s;min-width:0}.sfl15__file-row:hover{background:var(--fl-card-alt);border-color:var(--fl-border)}.sfl15__file-row.is-selected{background:linear-gradient(100deg,rgba(141,100,241,.12),rgba(102,180,245,.04));border-color:rgba(151,120,245,.40)}.sfl15__file-select{width:100%;display:flex;align-items:center;text-align:left;gap:12px;padding:11px 7px;border:0;background:transparent;color:inherit;min-width:0}.sfl15__file-select .sfl15__file-icon{flex:none}.sfl15__file-text{flex:1;min-width:0;display:grid;gap:5px}.sfl15__file-text strong{font-weight:850;font-size:11.5px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.sfl15__file-text small{font-size:10px;color:var(--fl-muted);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.sfl15__file-row .sfl15__state{flex:none;margin-right:9px}.sfl15__file-row .sfl15__file-chevron{flex:none;color:var(--fl-muted);margin-right:5px}.sfl15__file-icon{width:39px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(103,155,243,.15);color:#609be9}.sfl15__file-icon.is-sheet{background:rgba(36,176,145,.12);color:var(--fl-green)}.sfl15__state{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:6px 8px;background:rgba(140,103,249,.12);font-size:9px;font-weight:800;color:var(--fl-violet);white-space:nowrap}.sfl15__state.is-private{color:var(--fl-muted);background:var(--fl-card-alt)}.sfl15__state.is-shared{color:var(--fl-green);background:rgba(48,189,141,.11)}.sfl15__state.is-archived{color:var(--fl-amber);background:rgba(208,154,73,.12)}.sfl15__file-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.sfl15__file-grid .sfl15__file-row{position:relative;display:block;padding:13px;min-height:162px}.sfl15__file-grid .sfl15__file-select{display:flex;align-items:flex-start;flex-direction:column;gap:13px;padding:0}.sfl15__file-grid .sfl15__file-text{width:100%}.sfl15__file-grid .sfl15__file-text strong{white-space:normal;overflow-wrap:anywhere;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.sfl15__file-grid .sfl15__state{margin:12px 0 0 0}.sfl15__file-grid .sfl15__file-chevron{position:absolute;right:12px;top:12px}
.sfl15__explorer-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 21px;border-top:1px solid var(--fl-border);font-size:10px;color:var(--fl-muted)}
.sfl15__inspector{position:sticky;top:16px}.sfl15__inspector-top{padding:21px 20px 17px;border-bottom:1px solid var(--fl-border)}.sfl15__inspector-card{padding:24px 20px 15px;text-align:center}.sfl15__preview-icon{width:74px;height:80px;display:grid;place-items:center;border-radius:21px;margin:0 auto 17px;background:linear-gradient(150deg,rgba(99,159,246,.22),rgba(163,114,249,.2));color:var(--fl-violet);animation:sfl15Float 5s ease-in-out infinite}.sfl15__inspector-card h3{font-size:14px;line-height:1.35;overflow-wrap:anywhere;font-weight:900;margin-bottom:6px}.sfl15__inspector-card>p{color:var(--fl-muted);font-size:10px;line-height:1.6}.sfl15__inspector-card>.sfl15__state{margin-top:11px}.sfl15__fact-grid{padding:10px 21px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.sfl15__fact{border-top:1px solid var(--fl-border);padding-top:11px;min-width:0}.sfl15__fact span{font-size:9px;letter-spacing:.03em;color:var(--fl-muted)}.sfl15__fact b{font-size:11px;font-weight:800;display:block;margin-top:5px;overflow-wrap:anywhere}.sfl15__inspector-actions{padding:14px 21px 23px;display:grid;gap:8px}.sfl15__btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:39px;padding:9px 12px;border-radius:10px;border:1px solid var(--fl-border);color:var(--fl-text);background:var(--fl-card-alt);font-size:11px;font-weight:850;transition:transform .18s,box-shadow .18s,border-color .18s}.sfl15__btn:hover:not(:disabled){transform:translateY(-2px);border-color:rgba(150,111,236,.5);box-shadow:0 8px 18px rgba(122,84,201,.1)}.sfl15__btn.is-primary{color:#fff;background:linear-gradient(105deg,#6b74f0,#aa53df);border-color:transparent}.sfl15__btn.is-danger{color:#cd6e84;background:rgba(219,95,122,.075);border-color:rgba(219,95,122,.23)}.sfl15__inspector-actions .sfl15__btn{width:100%}.sfl15__empty{min-height:290px;display:grid;place-content:center;text-align:center;justify-items:center;gap:10px;padding:30px}.sfl15__empty svg{color:var(--fl-violet)}.sfl15__empty b{font-size:13px}.sfl15__empty p{font-size:11px;color:var(--fl-muted);max-width:270px;line-height:1.6}.sfl15__tip{font-size:10px;line-height:1.6;color:var(--fl-muted);padding:13px 20px;background:var(--fl-card-alt);border-top:1px solid var(--fl-border);display:flex;align-items:flex-start;gap:8px}.sfl15__tip svg{color:var(--fl-green);flex:none}.sfl15__notice{display:flex;align-items:center;gap:10px;padding:12px 15px;border-radius:12px;margin:13px 0;background:rgba(219,90,115,.1);color:#cc7183;font-size:11px}.sfl15__notice.is-ok{background:rgba(36,171,137,.1);color:var(--fl-green)}.sfl15__notice>span{flex:1}.sfl15__notice button{border:0;background:transparent;color:inherit}
/* Legacy secure modals intentionally reused and kept above the workspace. */
.sfl15 .library-modal-backdrop{z-index:11000}.sfl15 .library-access-modal,.sfl15 .library-archive-modal,.sfl15 .library-request-modal{max-height:min(88vh,760px);overflow:auto;scrollbar-width:none}.sfl15 .library-access-modal::-webkit-scrollbar,.sfl15 .library-archive-modal::-webkit-scrollbar,.sfl15 .library-request-modal::-webkit-scrollbar{display:none}
@keyframes sfl15Float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@media(max-width:1190px){.sfl15__main{grid-template-columns:minmax(0,1.4fr) minmax(270px,.8fr)}.sfl15__file-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:980px){.sfl15__main{grid-template-columns:minmax(0,1fr)}.sfl15__inspector{position:relative;top:auto}.sfl15__overview{grid-template-columns:repeat(2,minmax(0,1fr))}.sfl15__file-area{max-height:550px}}
@media(max-width:640px){.sfl15{padding:16px 12px 32px}.sfl15__hero{padding:22px;min-height:0}.sfl15__hero-art{display:none}.sfl15__hero h1{font-size:28px}.sfl15__overview{gap:9px}.sfl15__space{min-height:78px;padding:11px;gap:8px}.sfl15__space-icon{width:32px;height:34px;flex-basis:32px}.sfl15__space-text b{font-size:12px}.sfl15__space-text small{font-size:9px}.sfl15__space-arrow{display:none}.sfl15__explorer-head{padding:18px 13px}.sfl15__explorer-title>span{display:none}.sfl15__toolbar{gap:8px}.sfl15__select-wrap{flex:1}.sfl15__select-wrap select{width:100%}.sfl15__file-area{padding:8px;min-height:240px}.sfl15__file-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.sfl15__file-row .sfl15__state{display:none}.sfl15__file-grid .sfl15__file-row{min-height:140px}.sfl15__file-text strong{font-size:11px}.sfl15__file-chevron{display:none}.sfl15__inspector-card{padding:20px}}
@media(prefers-reduced-motion:reduce){.sfl15 *, .sfl15 *::before,.sfl15 *::after{animation:none!important;transition-duration:.01ms!important}}

/* V15.5.1 — stronger selection, non-destructive upload grouping, accessible actions. */
.sfl15__file-group-note{color:var(--fl-muted)}
.sfl15__file-list{gap:8px}.sfl15__group{min-width:0}
.sfl15__file-row{position:relative;isolation:isolate;overflow:hidden}
.sfl15__file-row::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:3px;background:transparent;border-radius:4px;transition:background .18s,box-shadow .18s;pointer-events:none}
.sfl15__file-row.is-selected{background:linear-gradient(100deg,rgba(144,102,250,.24),rgba(85,145,248,.10));border-color:rgba(163,127,255,.90);box-shadow:inset 0 0 0 1px rgba(167,128,255,.32),0 0 0 2px rgba(149,110,244,.13),0 8px 22px rgba(111,75,218,.09)}
.sfl15__file-row.is-selected::before{background:#bd93ff;box-shadow:0 0 14px #9e6cff}
.sfl15__file-row.is-selected .sfl15__file-icon{background:rgba(137,94,242,.27);color:#d2bbff}
html[data-theme="light"] .sfl15__file-row.is-selected .sfl15__file-icon{color:#784ce1}
.sfl15__file-row.is-selected .sfl15__file-text strong{color:var(--fl-text)}
.sfl15__file-select{padding-left:10px;min-width:0;min-height:57px}
.sfl15__upload-hint{display:inline-flex;align-items:center;gap:5px;color:var(--fl-violet)!important;font-size:10px!important;font-weight:700;white-space:normal!important;line-height:1.25}
.sfl15__uploads-toggle{margin-right:5px;flex:none;display:flex;align-items:center;gap:6px;border:1px solid var(--fl-border);background:var(--fl-card-alt);color:var(--fl-violet);border-radius:9px;padding:8px;min-height:34px;transition:background .18s,border-color .18s}
.sfl15__uploads-toggle:hover{background:rgba(141,100,241,.16);border-color:rgba(151,120,245,.52)}
.sfl15__uploads-toggle svg{transition:transform .18s}
.sfl15__uploads-toggle[aria-expanded="true"] svg{transform:rotate(180deg)}
.sfl15__uploads-toggle span{font-size:10px;font-weight:900;min-width:10px}
.sfl15__upload-versions{margin:5px 6px 10px 25px;padding:10px 11px 11px;border:1px solid var(--fl-border);border-left:2px solid rgba(159,122,247,.5);border-radius:0 11px 11px 11px;background:var(--fl-card-alt);display:grid;gap:5px;animation:sfl15VersionsIn .19s ease-out both}
.sfl15__upload-versions>p{display:flex;align-items:center;gap:7px;margin:0 0 4px;font-size:10px;color:var(--fl-muted);line-height:1.45}
.sfl15__upload-versions>p svg{flex:none;color:var(--fl-violet)}
.sfl15__upload-option{display:flex;align-items:center;gap:10px;text-align:left;width:100%;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--fl-text);padding:9px 10px;transition:background .18s,border-color .18s}
.sfl15__upload-option:hover{background:rgba(142,112,239,.09);border-color:rgba(142,112,239,.25)}
.sfl15__upload-option.is-selected{background:rgba(143,105,243,.17);border-color:rgba(150,111,250,.62);box-shadow:inset 2px 0 0 #b48aff}
.sfl15__upload-index{display:grid;place-items:center;flex:none;width:27px;height:27px;border-radius:8px;background:rgba(143,105,243,.13);color:var(--fl-violet);font-size:10px;font-weight:900}
.sfl15__upload-info{display:grid;gap:3px;min-width:0;flex:1}.sfl15__upload-info b{font-size:11px}.sfl15__upload-info small{font-size:10px;color:var(--fl-muted);line-height:1.4}
.sfl15__upload-current{display:inline-flex;align-items:center;gap:4px;color:var(--fl-green);font-size:10px;font-weight:850;white-space:nowrap}
.sfl15__selected-upload{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;color:var(--fl-violet)!important;font-weight:800;font-size:10px!important;margin:11px 0 0!important}
.sfl15__inspector-duplicates{margin:12px auto 0!important;display:flex;align-items:flex-start;text-align:left;gap:8px;padding:11px;border:1px solid rgba(153,119,248,.3);border-radius:11px;background:rgba(137,108,240,.08);font-size:10px!important;line-height:1.5;max-width:360px}
.sfl15__inspector-duplicates svg{flex:none;color:var(--fl-violet)}
.sfl15__btn.is-primary{position:relative;min-height:44px;overflow:hidden;gap:10px;box-shadow:0 9px 19px rgba(127,89,230,.16);background:linear-gradient(110deg,#6f70f5,#a849e2)}
.sfl15__btn.is-primary::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(115deg,transparent,rgba(255,255,255,.19),transparent);transform:translateX(-85%);transition:opacity .2s}
.sfl15__btn.is-primary:hover::before{opacity:1;animation:sfl15ButtonShine .65s ease-out both}
.sfl15__download-icon{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:rgba(255,255,255,.15);flex:none}
.sfl15__download-arrow{margin-left:auto;opacity:.8}
.sfl15__file-text strong{font-size:12px}
.sfl15__file-grid .sfl15__group{min-width:0}
.sfl15__file-grid .sfl15__upload-versions{margin:6px 0 4px;padding:8px}
.sfl15__file-grid .sfl15__upload-option{padding:8px 5px;gap:5px}
.sfl15__file-grid .sfl15__upload-info small{overflow-wrap:anywhere}
.sfl15__file-grid .sfl15__uploads-toggle{position:absolute;right:9px;bottom:10px;z-index:1}
.sfl15__file-grid .sfl15__file-row.has-uploads{padding-bottom:48px}
/* Match manage-access selection to the active theme (avoid bright white on dark). */
.sfl15 .library-access-modal{background:var(--fl-card);border:1px solid var(--fl-border);color:var(--fl-text)}
.sfl15 .library-access-modal h2,.sfl15 .library-private-choice b,.sfl15 .library-access-departments button b{color:var(--fl-text)}
.sfl15 .library-modal-file,.sfl15 .library-private-choice small{color:var(--fl-muted)}
.sfl15 .library-private-choice,.sfl15 .library-access-departments button{background:var(--fl-card-alt);color:var(--fl-text);border-color:var(--fl-border)}
.sfl15 .library-private-choice:hover,.sfl15 .library-access-departments button:hover{background:rgba(142,105,246,.10);border-color:rgba(164,132,251,.55)}
.sfl15 .library-private-choice.selected,.sfl15 .library-access-departments button.selected{background:linear-gradient(100deg,rgba(150,112,246,.19),rgba(120,145,237,.08));border-color:rgba(167,132,255,.66);box-shadow:inset 3px 0 0 #b791ff}
.sfl15 .library-private-choice.selected>span{background:rgba(141,108,241,.14);color:var(--fl-violet)}
.sfl15 .library-private-choice>svg{color:var(--fl-violet)}
@keyframes sfl15VersionsIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
@keyframes sfl15ButtonShine{from{transform:translateX(-85%)}to{transform:translateX(95%)}}
@media(max-width:640px){.sfl15__upload-versions{margin-left:9px;padding:8px}.sfl15__upload-current{font-size:9px}.sfl15__upload-hint{font-size:9px!important}.sfl15__file-grid .sfl15__uploads-toggle{right:6px}}
@media(prefers-reduced-motion:reduce){.sfl15__upload-versions,.sfl15__btn.is-primary:hover::before{animation:none!important}.sfl15__uploads-toggle svg{transition:none!important}}
`

const ACTIVE_REQUEST_STATUSES = new Set([
  'PENDING_OWNER',
  'PENDING_SECURITY',
])

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '—'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

function getApiError(error, fallback) {
  const detail =
    error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return fallback
}

function getFileIcon(type) {
  if (
    type === 'xlsx' ||
    type === 'csv'
  ) {
    return FileSpreadsheet
  }

  return FileText
}

function AnonymizedLibrary() {
  const navigate = useNavigate()

  const [myFiles, setMyFiles] =
    useState([])

  const [sharedFiles, setSharedFiles] =
    useState([])

  const [archivedFiles, setArchivedFiles] =
    useState([])

  const [myRequests, setMyRequests] =
    useState([])

  const [departments, setDepartments] =
    useState([])

  const [activeTab, setActiveTab] =
    useState('all')

  const [query, setQuery] =
    useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState('list')
  const [selectedFileKey, setSelectedFileKey] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    requestFile,
    setRequestFile,
  ] = useState(null)

  const [reason, setReason] =
    useState('')

  const [
    requesting,
    setRequesting,
  ] = useState(false)

  const [
    requestSuccess,
    setRequestSuccess,
  ] = useState(false)

  const [
    accessFile,
    setAccessFile,
  ] = useState(null)

  const [
    accessLoading,
    setAccessLoading,
  ] = useState(false)

  const [
    accessSaving,
    setAccessSaving,
  ] = useState(false)

  const [
    accessDepartmentIds,
    setAccessDepartmentIds,
  ] = useState([])

  const [
    originalAccessDepartmentIds,
    setOriginalAccessDepartmentIds,
  ] = useState([])

  const [
    accessError,
    setAccessError,
  ] = useState('')

  const [
    accessSuccess,
    setAccessSuccess,
  ] = useState('')

  const [
    archiveFile,
    setArchiveFile,
  ] = useState(null)

  const [
    archiving,
    setArchiving,
  ] = useState(false)

  const [
    archiveError,
    setArchiveError,
  ] = useState('')

  const [
    archiveSuccess,
    setArchiveSuccess,
  ] = useState('')

  const [
    restoringFileId,
    setRestoringFileId,
  ] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadLibrary = async () => {
      setLoading(true)
      setError('')

      try {
        const [
          myFilesResponse,
          sharedFilesResponse,
          archivedFilesResponse,
          myRequestsResponse,
          departmentsResponse,
        ] = await Promise.all([
          api.get(
            '/document-library/my-anonymized',
          ),
          api.get(
            '/document-library/shared-with-me',
          ),
          api.get(
            '/document-library/archived',
          ),
          api.get(
            '/original-file-requests/my-requests',
          ),
          api.get('/departments'),
        ])

        if (cancelled) {
          return
        }

        setMyFiles(
          myFilesResponse.data,
        )

        setSharedFiles(
          sharedFilesResponse.data,
        )

        setArchivedFiles(
          archivedFilesResponse.data,
        )

        setMyRequests(
          myRequestsResponse.data,
        )

        setDepartments(
          departmentsResponse.data,
        )
      } catch (loadError) {
        if (cancelled) {
          return
        }

        setError(
          getApiError(
            loadError,
            'Unable to load the anonymized file library.',
          ),
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLibrary()

    return () => {
      cancelled = true
    }
  }, [])

  const activeRequestDocumentIds =
    useMemo(
      () =>
        new Set(
          myRequests
            .filter((request) =>
              ACTIVE_REQUEST_STATUSES.has(
                request.status,
              ),
            )
            .map(
              (request) =>
                request.document_id,
            ),
        ),
      [myRequests],
    )

  const approvedRequestDocumentIds =
    useMemo(
      () =>
        new Set(
          myRequests
            .filter(
              (request) =>
                request.status ===
                'APPROVED',
            )
            .map(
              (request) =>
                request.document_id,
            ),
        ),
      [myRequests],
    )

  const allFiles = useMemo(() => {
    const mappedMyFiles =
      myFiles.map((file) => ({
        ...file,
        libraryGroup: 'my',
      }))

    const ownIds = new Set(
      mappedMyFiles.map(
        (file) => file.id,
      ),
    )

    const mappedSharedFiles =
      sharedFiles
        .filter(
          (file) =>
            !ownIds.has(file.id),
        )
        .map((file) => ({
          ...file,
          libraryGroup:
            'department',
        }))

    return [
      ...mappedMyFiles,
      ...mappedSharedFiles,
    ].sort(
      (a, b) =>
        new Date(
          b.created_at,
        ).getTime() -
        new Date(
          a.created_at,
        ).getTime(),
    )
  }, [myFiles, sharedFiles])

  const departmentSharedCount =
    useMemo(
      () =>
        allFiles.filter(
          (file) =>
            file.libraryGroup ===
            'department',
        ).length,
      [allFiles],
    )

  const privateFileCount =
    useMemo(
      () =>
        myFiles.filter(
          (file) =>
            file.is_private,
        ).length,
      [myFiles],
    )

  const sharedByMeCount =
    useMemo(
      () =>
        myFiles.filter(
          (file) =>
            !file.is_private,
        ).length,
      [myFiles],
    )

  const visibleFiles =
    useMemo(() => {
      let files = allFiles

      if (activeTab === 'my') {
        files = allFiles.filter(
          (file) =>
            file.libraryGroup ===
            'my',
        )
      }

      if (
        activeTab ===
        'department'
      ) {
        files = allFiles.filter(
          (file) =>
            file.libraryGroup ===
            'department',
        )
      }

      if (
        activeTab ===
        'archived'
      ) {
        files =
          archivedFiles.map(
            (file) => ({
              ...file,
              libraryGroup:
                'archived',
            }),
          )
      }

      const normalizedQuery =
        query
          .trim()
          .toLowerCase()

      if (!normalizedQuery) {
        return files
      }

      return files.filter(
        (file) =>
          [
            file.original_filename,
            file.owner_username,
            file.file_type,
          ]
            .join(' ')
            .toLowerCase()
            .includes(
              normalizedQuery,
            ),
      )
    }, [
      activeTab,
      allFiles,
      archivedFiles,
      query,
    ])

  const refreshFileLists =
    async () => {
      const [
        myFilesResponse,
        sharedFilesResponse,
        archivedFilesResponse,
      ] = await Promise.all([
        api.get(
          '/document-library/my-anonymized',
        ),
        api.get(
          '/document-library/shared-with-me',
        ),
        api.get(
          '/document-library/archived',
        ),
      ])

      setMyFiles(
        myFilesResponse.data,
      )

      setSharedFiles(
        sharedFilesResponse.data,
      )

      setArchivedFiles(
        archivedFilesResponse.data,
      )
    }

  const handleDownload =
    async (file) => {
      setError('')

      try {
        const response =
          await api.get(
            `/document-library/${file.id}/download-anonymized`,
            {
              responseType:
                'blob',
            },
          )

        const objectUrl =
          URL.createObjectURL(
            response.data,
          )

        const link =
          document.createElement(
            'a',
          )

        link.href = objectUrl

        link.download =
          `anonymized_${file.original_filename}`

        document.body.appendChild(
          link,
        )

        link.click()
        link.remove()

        URL.revokeObjectURL(
          objectUrl,
        )
      } catch (downloadError) {
        setError(
          getApiError(
            downloadError,
            'Unable to download the anonymized document.',
          ),
        )
      }
    }

  const openRequestModal = (
    file,
  ) => {
    setRequestFile(file)
    setReason('')
    setRequestSuccess(false)
    setError('')
  }

  const closeRequestModal =
    () => {
      if (requesting) {
        return
      }

      setRequestFile(null)
      setReason('')
      setRequestSuccess(false)
    }

  const submitOriginalRequest =
    async () => {
      const trimmedReason =
        reason.trim()

      if (
        !requestFile ||
        !trimmedReason
      ) {
        return
      }

      setRequesting(true)
      setError('')

      try {
        const response =
          await api.post(
            `/original-file-requests/${requestFile.id}`,
            {
              reason:
                trimmedReason,
            },
          )

        setMyRequests(
          (current) => [
            response.data,
            ...current,
          ],
        )

        setRequestSuccess(true)
      } catch (requestError) {
        setError(
          getApiError(
            requestError,
            'Unable to submit the original access request.',
          ),
        )
      } finally {
        setRequesting(false)
      }
    }

  const loadAccessShares =
    async (file) => {
      const response =
        await api.get(
          `/document-library/${file.id}/shares`,
        )

      return response.data.map(
        (share) =>
          share.department_id,
      )
    }

  const openAccessModal =
    async (file) => {
      setAccessFile(file)
      setAccessLoading(true)
      setAccessSaving(false)
      setAccessError('')
      setAccessSuccess('')
      setAccessDepartmentIds([])
      setOriginalAccessDepartmentIds(
        [],
      )

      try {
        const ids =
          await loadAccessShares(
            file,
          )

        setAccessDepartmentIds(
          ids,
        )

        setOriginalAccessDepartmentIds(
          ids,
        )
      } catch (shareError) {
        setAccessError(
          getApiError(
            shareError,
            'Unable to load document access settings.',
          ),
        )
      } finally {
        setAccessLoading(false)
      }
    }

  const closeAccessModal = () => {
    if (accessSaving) {
      return
    }

    setAccessFile(null)
    setAccessDepartmentIds([])
    setOriginalAccessDepartmentIds(
      [],
    )
    setAccessError('')
    setAccessSuccess('')
  }

  const toggleAccessDepartment = (
    departmentId,
  ) => {
    if (accessSaving) {
      return
    }

    setAccessSuccess('')

    setAccessDepartmentIds(
      (current) =>
        current.includes(
          departmentId,
        )
          ? current.filter(
              (id) =>
                id !==
                departmentId,
            )
          : [
              ...current,
              departmentId,
            ],
    )
  }

  const makeAccessPrivate = () => {
    if (accessSaving) {
      return
    }

    setAccessSuccess('')
    setAccessDepartmentIds([])
  }

  const saveAccessChanges =
    async () => {
      if (!accessFile) {
        return
      }

      const toAdd =
        accessDepartmentIds.filter(
          (id) =>
            !originalAccessDepartmentIds.includes(
              id,
            ),
        )

      const toRemove =
        originalAccessDepartmentIds.filter(
          (id) =>
            !accessDepartmentIds.includes(
              id,
            ),
        )

      if (
        toAdd.length === 0 &&
        toRemove.length === 0
      ) {
        setAccessSuccess(
          'No access changes to save.',
        )

        return
      }

      setAccessSaving(true)
      setAccessError('')
      setAccessSuccess('')

      try {
        for (
          const departmentId
          of toAdd
        ) {
          await api.post(
            `/document-library/${accessFile.id}/share`,
            {
              department_id:
                departmentId,
            },
          )
        }

        for (
          const departmentId
          of toRemove
        ) {
          await api.delete(
            `/document-library/${accessFile.id}/share/${departmentId}`,
          )
        }

        const syncedIds =
          await loadAccessShares(
            accessFile,
          )

        setAccessDepartmentIds(
          syncedIds,
        )

        setOriginalAccessDepartmentIds(
          syncedIds,
        )

        setAccessFile(
          (current) =>
            current
              ? {
                  ...current,
                  is_private:
                    syncedIds.length ===
                    0,
                }
              : current,
        )

        await refreshFileLists()

        setAccessSuccess(
          syncedIds.length === 0
            ? 'Document is now private.'
            : `Access updated for ${syncedIds.length} department${syncedIds.length === 1 ? '' : 's'}.`,
        )
      } catch (saveError) {
        setAccessError(
          getApiError(
            saveError,
            'Unable to update document access.',
          ),
        )

        try {
          const syncedIds =
            await loadAccessShares(
              accessFile,
            )

          setAccessDepartmentIds(
            syncedIds,
          )

          setOriginalAccessDepartmentIds(
            syncedIds,
          )

          await refreshFileLists()
        } catch {
          // Keep the modal open so
          // the user can retry.
        }
      } finally {
        setAccessSaving(false)
      }
    }

  const openArchiveModal =
    (file) => {
      setArchiveFile(file)
      setArchiveError('')
      setArchiveSuccess('')
    }

  const closeArchiveModal =
    () => {
      if (archiving) {
        return
      }

      setArchiveFile(null)
      setArchiveError('')
    }

  const archiveDocument =
    async () => {
      if (!archiveFile) {
        return
      }

      setArchiving(true)
      setArchiveError('')
      setError('')

      try {
        await api.patch(
          `/document-library/${archiveFile.id}/archive`,
        )

        const archivedName =
          archiveFile.original_filename

        await refreshFileLists()

        setArchiveFile(null)

        setArchiveSuccess(
          `${archivedName} was removed from the active library.`,
        )
      } catch (archiveRequestError) {
        setArchiveError(
          getApiError(
            archiveRequestError,
            'Unable to remove this document from the library.',
          ),
        )
      } finally {
        setArchiving(false)
      }
    }

  const restoreDocument =
    async (file) => {
      setRestoringFileId(file.id)
      setError('')
      setArchiveSuccess('')

      try {
        await api.patch(
          `/document-library/${file.id}/restore`,
        )

        await refreshFileLists()

        setArchiveSuccess(
          `${file.original_filename} was restored to My Files as a private document.`,
        )

        setActiveTab('my')
      } catch (restoreError) {
        setError(
          getApiError(
            restoreError,
            'Unable to restore this document.',
          ),
        )
      } finally {
        setRestoringFileId(null)
      }
    }

  const sortedFiles = visibleFiles
    .filter(file => typeFilter === 'all' || (
      typeFilter === 'sheet' ? ['xlsx','csv'].includes(String(file.file_type||'').toLowerCase())
      : !['xlsx','csv'].includes(String(file.file_type||'').toLowerCase())
    ))
    .slice()
    .sort((a,b) => {
      if (sortBy === 'name') return String(a.original_filename||'').localeCompare(String(b.original_filename||''))
      const dateA = new Date(a.libraryGroup === 'archived' ? a.archived_at : a.created_at).getTime() || 0
      const dateB = new Date(b.libraryGroup === 'archived' ? b.archived_at : b.created_at).getTime() || 0
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA
    })
  const selectedFile = sortedFiles.find(file => `${file.libraryGroup}-${file.id}` === selectedFileKey) || sortedFiles[0] || null

  // Presentation grouping only. Files are never deleted, merged, or treated as
  // real revisions: each upload retains its own backend document ID and actions.
  // Owner + filename + library category + privacy flag prevents unrelated
  // owners, access scopes and permission states from being combined.
  const fileGroupsByKey = new Map()
  for (const file of sortedFiles) {
    const groupKey = JSON.stringify([
      file.libraryGroup,
      String(file.owner_id ?? file.owner_username ?? ''),
      String(file.original_filename ?? '').trim().toLocaleLowerCase(),
      Boolean(file.is_private),
    ])
    if (!fileGroupsByKey.has(groupKey)) {
      fileGroupsByKey.set(groupKey, { groupKey, files: [] })
    }
    fileGroupsByKey.get(groupKey).files.push(file)
  }
  const fileGroups = [...fileGroupsByKey.values()]
  const selectedGroup = fileGroups.find((group) => group.files.some(
    (file) => `${file.libraryGroup}-${file.id}` ===
      (selectedFile ? `${selectedFile.libraryGroup}-${selectedFile.id}` : ''),
  ))
  const toggleUploads = (groupKey) => {
    setExpandedGroups((current) => current.includes(groupKey)
      ? current.filter((key) => key !== groupKey)
      : [...current, groupKey])
  }

  return (
    <div className="sfl15">
      <style>{SECURA_FILE_SPACE_CSS}</style>
      <header className="sfl15__hero">
        <div>
          <span className="sfl15__label"><ShieldCheck size={14} /> YOUR DOCUMENT SPACE</span>
          <h1>All your files, one safe space.</h1>
          <p>Find protected documents, open files shared with your department, and manage access—all in one simple place.</p>
          <button type="button" className="sfl15__hero-action" onClick={() => navigate('/user/anonymize')}>
            <Sparkles size={15}/> Protect another document <ArrowRight size={15}/>
          </button>
        </div>
        <div className="sfl15__hero-art" aria-hidden="true"><span><FolderOpen size={40}/></span></div>
      </header>

      {error && <div className="sfl15__notice" role="alert"><AlertTriangle size={16}/><span>{error}</span>
        <button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
      {archiveSuccess && <div className="sfl15__notice is-ok" role="status"><CheckCircle2 size={16}/><span>{archiveSuccess}</span>
        <button type="button" aria-label="Dismiss message" onClick={() => setArchiveSuccess('')}><X size={16}/></button></div>}

      <nav className="sfl15__overview" aria-label="Document library folders">
        {[
          {key:'all', label:'All documents', count:allFiles.length, note:'Your full library', Icon:Files, tone:''},
          {key:'my', label:'My files', count:myFiles.length, note:`${privateFileCount} private · ${sharedByMeCount} shared`, Icon:FileText, tone:'is-own'},
          {key:'department', label:'Shared with me', count:departmentSharedCount, note:'From your department', Icon:Building2, tone:'is-shared'},
          {key:'archived', label:'Archived', count:archivedFiles.length, note:'Can be restored', Icon:Archive, tone:'is-archive'},
        ].map(({key,label,count,note,Icon,tone}) => (
          <button key={key} type="button" className={`sfl15__space ${tone} ${activeTab === key ? 'is-active' : ''}`}
            aria-current={activeTab === key ? 'page' : undefined} onClick={() => {setActiveTab(key);setSelectedFileKey(null)}}>
            <span className="sfl15__space-icon"><Icon size={18}/></span>
            <span className="sfl15__space-text"><b>{count} {label}</b><small>{note}</small></span>
            <ChevronRight className="sfl15__space-arrow" size={15}/>
          </button>
        ))}
      </nav>

      <div className="sfl15__main">
        <section className="sfl15__explorer" aria-label="File explorer">
          <header className="sfl15__explorer-head">
            <div className="sfl15__explorer-title">
              <div><span className="sfl15__label"><FolderOpen size={13}/> FILE EXPLORER</span>
                <h2>{activeTab === 'all' ? 'Browse all documents' : activeTab === 'my' ? 'My protected files' : activeTab === 'department' ? 'Shared with me' : 'Archived files'}</h2>
              </div>
              <span>Select any file to see its details and available actions</span>
            </div>
            <div className="sfl15__toolbar">
              <label className="sfl15__search"><Search size={16}/>
                <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by file name or owner" aria-label="Search files"/>
                {query && <button type="button" onClick={()=>setQuery('')} aria-label="Clear search"><X size={15}/></button>}
              </label>
              <label className="sfl15__select-wrap"><Filter size={14}/>
                <select value={typeFilter} onChange={event=>setTypeFilter(event.target.value)} aria-label="File type">
                  <option value="all">All types</option><option value="document">Documents</option><option value="sheet">Spreadsheets</option>
                </select>
              </label>
              <label className="sfl15__select-wrap"><ArrowDownUp size={14}/>
                <select value={sortBy} onChange={event=>setSortBy(event.target.value)} aria-label="Sort files">
                  <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option>
                </select>
              </label>
              <div className="sfl15__view-switch" role="group" aria-label="File view">
                <button type="button" title="List view" aria-label="List view" aria-pressed={viewMode==='list'} className={viewMode==='list'?'is-on':''} onClick={()=>setViewMode('list')}><List size={16}/></button>
                <button type="button" title="Grid view" aria-label="Grid view" aria-pressed={viewMode==='grid'} className={viewMode==='grid'?'is-on':''} onClick={()=>setViewMode('grid')}><LayoutGrid size={16}/></button>
              </div>
            </div>
          </header>
          <div className="sfl15__file-area">
            {loading ? <div className="sfl15__empty"><LoaderCircle size={29}/><b>Loading your files…</b><p>Getting your secure document library.</p></div>
            : sortedFiles.length === 0 ? <div className="sfl15__empty"><FolderOpen size={29}/><b>{query || typeFilter !== 'all' ? 'No matching documents' : activeTab === 'archived' ? 'Nothing archived yet' : 'No files here yet'}</b>
              <p>{query || typeFilter !== 'all' ? 'Try another file name or choose All types.' : activeTab === 'department' ? 'Files shared with your department will appear here.' : activeTab === 'archived' ? 'Removed files can be restored here later.' : 'Anonymize a document to get started.'}</p></div>
            : <div className={viewMode === 'grid' ? 'sfl15__file-grid' : 'sfl15__file-list'}>
                {fileGroups.map((group) => {
                  const file = group.files[0]
                  const Icon = getFileIcon(file.file_type)
                  const archive = file.libraryGroup === 'archived'
                  const own = file.libraryGroup === 'my' || archive
                  const status = archive ? 'Archived' : own
                    ? (file.is_private ? 'Private' : 'Shared by me')
                    : 'Shared with me'
                  const groupSelected = selectedFile && group.files.some(
                    (item) => item.id === selectedFile.id &&
                      item.libraryGroup === selectedFile.libraryGroup,
                  )
                  const expanded = expandedGroups.includes(group.groupKey)
                  const duplicate = group.files.length > 1
                  return (
                    <div className="sfl15__group" key={group.groupKey}>
                      <article className={`sfl15__file-row ${groupSelected ? 'is-selected' : ''} ${duplicate ? 'has-uploads' : ''}`}>
                        <button type="button" className="sfl15__file-select"
                          aria-label={`View details for ${file.original_filename}${duplicate ? `, ${group.files.length} separate uploads` : ''}`}
                          aria-pressed={Boolean(groupSelected)}
                          onClick={() => setSelectedFileKey(`${file.libraryGroup}-${file.id}`)}>
                          <span className={`sfl15__file-icon ${['xlsx', 'csv'].includes(String(file.file_type || '').toLowerCase()) ? 'is-sheet' : ''}`}>
                            <Icon size={19} />
                          </span>
                          <span className="sfl15__file-text">
                            <strong title={file.original_filename}>{file.original_filename}</strong>
                            <small>{formatBytes(file.file_size)} · {own ? 'You' : file.owner_username} · {formatDate(archive ? file.archived_at : file.created_at)}</small>
                            {duplicate && <small className="sfl15__upload-hint">
                              <Files size={12} /> {group.files.length} separate uploads · Open to choose a file
                            </small>}
                          </span>
                        </button>
                        <span className={`sfl15__state ${archive ? 'is-archived' : own && file.is_private ? 'is-private' : 'is-shared'}`}>{status}</span>
                        {duplicate ? (
                          <button type="button" className="sfl15__uploads-toggle"
                            title={expanded ? 'Hide individual uploads' : 'Show individual uploads'}
                            aria-label={`${expanded ? 'Hide' : 'Show'} ${group.files.length} uploads of ${file.original_filename}`}
                            aria-expanded={expanded}
                            onClick={() => toggleUploads(group.groupKey)}>
                            <span>{group.files.length}</span><ChevronDown size={15} />
                          </button>
                        ) : <ChevronRight size={15} className="sfl15__file-chevron" aria-hidden="true" />}
                      </article>
                      {duplicate && expanded && (
                        <div className="sfl15__upload-versions" role="group" aria-label={`Individual uploads of ${file.original_filename}`}>
                          <p><Files size={13}/> Separate uploads — select the exact record before downloading or changing access.</p>
                          {group.files.map((upload, index) => {
                            const uploadSelected = selectedFile?.id === upload.id &&
                              selectedFile?.libraryGroup === upload.libraryGroup
                            return (
                              <button key={`${upload.libraryGroup}-${upload.id}`} type="button"
                                className={`sfl15__upload-option ${uploadSelected ? 'is-selected' : ''}`}
                                aria-pressed={Boolean(uploadSelected)}
                                onClick={() => setSelectedFileKey(`${upload.libraryGroup}-${upload.id}`)}>
                                <span className="sfl15__upload-index">{index + 1}</span>
                                <span className="sfl15__upload-info"><b>Upload #{upload.id}</b>
                                  <small>{formatBytes(upload.file_size)} · {formatDateTime(upload.created_at)}</small>
                                </span>
                                {uploadSelected ? <span className="sfl15__upload-current"><Check size={13}/> Selected</span> : <ChevronRight size={15} />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>}
          </div>
          <footer className="sfl15__explorer-foot"><span>Showing {fileGroups.length} file {fileGroups.length === 1 ? 'group' : 'groups'} · {sortedFiles.length} individual files</span><span>{activeTab === 'archived'?'Archive':'Secure library'} · SECURA</span></footer>
        </section>

        <aside className="sfl15__inspector" aria-label="Selected document details">
          <header className="sfl15__inspector-top"><span className="sfl15__label"><ShieldCheck size={13}/> FILE DETAILS</span>
            <h2>Document details</h2></header>
          {!selectedFile ? <div className="sfl15__empty"><FileText size={28}/><b>Choose a document</b><p>Select a file on the left to see its details and actions.</p></div>
          : <>
              <div className="sfl15__inspector-card">
                <div className="sfl15__preview-icon">{(() => {const Icon=getFileIcon(selectedFile.file_type); return <Icon size={35}/>})()}</div>
                <h3>{selectedFile.original_filename}</h3>
                <p>Protected document · SECURA</p>
                <p className="sfl15__selected-upload"><CheckCircle2 size={14} /> Selected upload #{selectedFile.id}</p>
                {selectedGroup && selectedGroup.files.length > 1 && (
                  <p className="sfl15__inspector-duplicates">
                    <Files size={14} /> {selectedGroup.files.length} uploads share this name.
                    Each upload is stored separately. Expand the group to choose a different one.
                  </p>
                )}
                <span className={`sfl15__state ${selectedFile.libraryGroup==='archived'?'is-archived':selectedFile.libraryGroup==='department'||!selectedFile.is_private?'is-shared':'is-private'}`}>
                  {selectedFile.libraryGroup==='archived'?'Archived':selectedFile.libraryGroup==='department'?'Shared with me':selectedFile.is_private?'Private':'Shared by me'}
                </span>
              </div>
              <div className="sfl15__fact-grid">
                <div className="sfl15__fact"><span>File format</span><b>{String(selectedFile.file_type||'File').toUpperCase()}</b></div>
                <div className="sfl15__fact"><span>File size</span><b>{formatBytes(selectedFile.file_size)}</b></div>
                <div className="sfl15__fact"><span>Owner</span><b>{selectedFile.libraryGroup==='department'?selectedFile.owner_username:'You'}</b></div>
                <div className="sfl15__fact"><span>{selectedFile.libraryGroup==='archived'?'Archived on':'Uploaded on'}</span>
                  <b>{formatDate(selectedFile.libraryGroup==='archived'?selectedFile.archived_at:selectedFile.created_at)}</b></div>
              </div>
              <div className="sfl15__inspector-actions">
                {selectedFile.libraryGroup==='archived' ? <button type="button" className="sfl15__btn is-primary" disabled={restoringFileId===selectedFile.id} onClick={()=>restoreDocument(selectedFile)}><RotateCcw size={16}/>{restoringFileId===selectedFile.id?'Restoring…':'Restore to My files'}</button>
                : <button type="button" className="sfl15__btn is-primary" onClick={()=>handleDownload(selectedFile)}><span className="sfl15__download-icon"><Download size={17} strokeWidth={2.4}/></span><span>Download anonymized file</span><ArrowRight size={15} className="sfl15__download-arrow" /></button>}
                {selectedFile.libraryGroup==='my' && <>
                  <button type="button" className="sfl15__btn" onClick={()=>openAccessModal(selectedFile)}><Share2 size={15}/>Manage department access</button>
                  <button type="button" className="sfl15__btn is-danger" onClick={()=>openArchiveModal(selectedFile)}><Archive size={15}/>Remove from library</button>
                </>}
                {selectedFile.libraryGroup==='department' && (
                  approvedRequestDocumentIds.has(selectedFile.id)
                  ? <button type="button" className="sfl15__btn" onClick={()=>navigate('/user/approved-originals')}><CheckCircle2 size={16}/>Open approved originals</button>
                  : <button type="button" className="sfl15__btn" disabled={activeRequestDocumentIds.has(selectedFile.id)} onClick={()=>openRequestModal(selectedFile)}><LockKeyhole size={15}/>{activeRequestDocumentIds.has(selectedFile.id)?'Original request pending':'Request original access'}</button>
                )}
              </div>
              <div className="sfl15__tip"><ShieldCheck size={15}/><span>Only anonymized copies are shared. Access to an original file requires the SECURA approval workflow.</span></div>
            </>}
        </aside>
      </div>
      {accessFile && (
        <div
          className="library-modal-backdrop"
          onClick={
            closeAccessModal
          }
        >
          <section
            className="library-access-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="library-modal-close"
              onClick={
                closeAccessModal
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <p className="secura-eyebrow">
              DOCUMENT ACCESS
            </p>

            <h2>Manage access</h2>

            <p className="library-modal-file">
              {
                accessFile.original_filename
              }
            </p>

            {accessError && (
              <div className="library-access-feedback error">
                <ShieldCheck
                  size={15}
                />

                <span>
                  {accessError}
                </span>
              </div>
            )}

            {accessSuccess && (
              <div className="library-access-feedback success">
                <CheckCircle2
                  size={15}
                />

                <span>
                  {accessSuccess}
                </span>
              </div>
            )}

            {accessLoading ? (
              <div className="library-access-loading">
                <div />
                <div />
                <div />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={[
                    'library-private-choice',
                    accessDepartmentIds.length ===
                    0
                      ? 'selected'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={
                    makeAccessPrivate
                  }
                >
                  <span>
                    <LockKeyhole
                      size={17}
                    />
                  </span>

                  <div>
                    <b>
                      Private only
                    </b>

                    <small>
                      Only you can access
                      this anonymized file.
                    </small>
                  </div>

                  {accessDepartmentIds.length ===
                    0 && (
                    <Check
                      size={17}
                    />
                  )}
                </button>

                <div className="library-access-separator">
                  <span>
                    OR SHARE WITH
                    DEPARTMENTS
                  </span>
                </div>

                {departments.length ===
                0 ? (
                  <p className="library-access-empty">
                    No departments are
                    currently available.
                  </p>
                ) : (
                  <div className="library-access-departments">
                    {departments.map(
                      (
                        department,
                      ) => {
                        const selected =
                          accessDepartmentIds.includes(
                            department.id,
                          )

                        return (
                          <button
                            key={
                              department.id
                            }
                            type="button"
                            className={
                              selected
                                ? 'selected'
                                : ''
                            }
                            onClick={() =>
                              toggleAccessDepartment(
                                department.id,
                              )
                            }
                          >
                            <span>
                              <Building2
                                size={16}
                              />
                            </span>

                            <b>
                              {
                                department.name
                              }
                            </b>

                            <i>
                              {selected && (
                                <Check
                                  size={13}
                                />
                              )}
                            </i>
                          </button>
                        )
                      },
                    )}
                  </div>
                )}

                <div className="library-access-summary">
                  <Share2
                    size={15}
                  />

                  <span>
                    {accessDepartmentIds.length ===
                    0
                      ? 'Private: no departments have access.'
                      : `Shared with ${accessDepartmentIds.length} department${accessDepartmentIds.length === 1 ? '' : 's'}.`}
                  </span>
                </div>

                <div className="library-modal-actions">
                  <button
                    type="button"
                    className="library-cancel-button"
                    onClick={
                      closeAccessModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="library-primary-compact"
                    disabled={
                      accessSaving
                    }
                    onClick={
                      saveAccessChanges
                    }
                  >
                    {accessSaving
                      ? 'Saving...'
                      : 'Save access'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {archiveFile && (
        <div
          className="library-modal-backdrop"
          onClick={
            closeArchiveModal
          }
        >
          <section
            className="library-archive-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="library-modal-close"
              onClick={
                closeArchiveModal
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <span className="library-archive-modal-icon">
              <Archive
                size={22}
              />
            </span>

            <p className="secura-eyebrow">
              DOCUMENT LIFECYCLE
            </p>

            <h2>
              Remove from library?
            </h2>

            <p className="library-modal-file">
              {
                archiveFile.original_filename
              }
            </p>

            <p className="library-archive-description">
              This is a soft removal.
              Secura keeps the document
              record for audit and approval
              history instead of permanently
              deleting security records.
            </p>

            <div className="library-archive-impact">
              <div>
                <Share2
                  size={15}
                />

                <span>
                  Department sharing will
                  stop immediately.
                </span>
              </div>

              <div>
                <LockKeyhole
                  size={15}
                />

                <span>
                  The file will disappear
                  from the active anonymized
                  library.
                </span>
              </div>

              <div>
                <ShieldCheck
                  size={15}
                />

                <span>
                  New original-access
                  requests will be blocked.
                </span>
              </div>
            </div>

            <div className="library-archive-warning">
              <AlertTriangle
                size={16}
              />

              <span>
                Pending original-access
                requests must be resolved
                before this document can
                be removed.
              </span>
            </div>

            {archiveError && (
              <div className="library-access-feedback error">
                <ShieldCheck
                  size={15}
                />

                <span>
                  {archiveError}
                </span>
              </div>
            )}

            <div className="library-modal-actions">
              <button
                type="button"
                className="library-cancel-button"
                onClick={
                  closeArchiveModal
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="library-archive-confirm"
                disabled={archiving}
                onClick={
                  archiveDocument
                }
              >
                <Archive
                  size={14}
                />

                {archiving
                  ? 'Removing...'
                  : 'Remove document'}
              </button>
            </div>
          </section>
        </div>
      )}

      {requestFile && (
        <div
          className="library-modal-backdrop"
          onClick={
            closeRequestModal
          }
        >
          <section
            className="library-request-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="library-modal-close"
              onClick={
                closeRequestModal
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {requestSuccess ? (
              <div className="library-request-success">
                <span>
                  <CheckCircle2
                    size={22}
                  />
                </span>

                <h2>
                  Request submitted
                </h2>

                <p>
                  Your request for{' '}
                  <b>
                    {
                      requestFile.original_filename
                    }
                  </b>{' '}
                  has been sent to
                  the document owner
                  for review.
                </p>

                <button
                  type="button"
                  className="library-primary-button"
                  onClick={
                    closeRequestModal
                  }
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="secura-eyebrow">
                  ORIGINAL ACCESS
                </p>

                <h2>
                  Request original
                  file
                </h2>

                <p className="library-modal-file">
                  {
                    requestFile.original_filename
                  }
                </p>

                <label>
                  Reason for access

                  <textarea
                    value={reason}
                    maxLength={500}
                    onChange={(
                      event,
                    ) =>
                      setReason(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Explain why you need access to the original file..."
                  />
                </label>

                <div className="library-reason-count">
                  {reason.length}/500
                </div>

                <p className="library-access-note">
                  <ShieldCheck
                    size={15}
                  />

                  Original file access
                  requires approval
                  from the document
                  owner and a Security
                  Officer.
                </p>

                <div className="library-modal-actions">
                  <button
                    type="button"
                    className="library-cancel-button"
                    onClick={
                      closeRequestModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="library-primary-compact"
                    disabled={
                      requesting ||
                      !reason.trim()
                    }
                    onClick={
                      submitOriginalRequest
                    }
                  >
                    {requesting
                      ? 'Submitting...'
                      : 'Submit request'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default AnonymizedLibrary
