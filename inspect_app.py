"""
SIEGER - Cone Inspection System  |  Standalone Desktop App (Tkinter)
Run: venv\Scripts\python.exe inspect_app.py
"""
from __future__ import annotations
import base64, io, random, sys, threading, time, tkinter as tk
from pathlib import Path
from tkinter import filedialog
from typing import Optional
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    import cv2; OPENCV_OK = True
except ImportError:
    OPENCV_OK = False

try:
    from PIL import Image, ImageDraw, ImageTk
except ImportError:
    print("ERROR: pip install Pillow"); sys.exit(1)

try:
    from backend.cv.pipeline import InspectionPipeline; PIPELINE_OK = True
except Exception:
    PIPELINE_OK = False

BG = "#0f1923"; SURFACE = "#151e28"; SURFACE2 = "#1a2535"; BORDER = "#253040"
TEXT_PRI = "#e2e8f0"; TEXT_SEC = "#94a3b8"; TEXT_MUTED = "#64748b"
ACCENT_GRN = "#10b981"; ACCENT_PUR = "#8b5cf6"; ACCENT_BLU = "#3b82f6"
ACCENT_RED = "#ef4444"; ACCENT_AMB = "#f59e0b"; CAM_BG = "#060d14"

def _b64_pil(b64):
    return Image.open(io.BytesIO(base64.b64decode(b64)))

def _cv_b64_pil(b64):
    data = np.frombuffer(base64.b64decode(b64), np.uint8)
    return Image.fromarray(cv2.cvtColor(cv2.imdecode(data, 1), cv2.COLOR_BGR2RGB))

def _pil_tk(img, w, h):
    return ImageTk.PhotoImage(img.resize((w, h), Image.LANCZOS))

def _placeholder(w, h, color):
    img = Image.new("RGB", (w, h), CAM_BG)
    d = ImageDraw.Draw(img)
    for x in range(0, w, 28):
        d.line([(x,4),(min(x+14,w),4)], fill=color, width=1)
        d.line([(x,h-5),(min(x+14,w),h-5)], fill=color, width=1)
    for y in range(0, h, 28):
        d.line([(4,y),(4,min(y+14,h))], fill=color, width=1)
        d.line([(w-5,y),(w-5,min(y+14,h))], fill=color, width=1)
    cx, cy = w//2, h//2-28
    pts = [cx-34,cy-20,cx-14,cy-20,cx-10,cy-28,cx+34,cy-28,cx+34,cy+20,cx-34,cy+20]
    d.polygon(pts, outline=color, fill=None, width=2)
    d.text((w//2, cy+40), "DROP IMAGES HERE", fill=color, anchor="mm")
    d.text((w//2, cy+58), "or click to browse", fill=TEXT_MUTED, anchor="mm")
    d.rounded_rectangle([w//2-60,cy+68,w//2+60,cy+88], radius=5, outline=color, width=1)
    d.text((w//2, cy+78), "  Select Images", fill=color, anchor="mm")
    return img

class KPI:
    def __init__(self):
        self.total=self.accepted=self.defective=0
        self.stain=self.pattern_fail=self.thread_mix=self.yarn_miss=0
        self.start_time=None
    def reset(self): self.__init__()
    @property
    def elapsed(self):
        if not self.start_time: return "00:00:00"
        s=int(time.time()-self.start_time)
        return f"{s//3600:02d}:{(s%3600)//60:02d}:{s%60:02d}"

class CameraPanel(tk.Frame):
    def __init__(self, parent, label, color, **kw):
        super().__init__(parent, bg=SURFACE, highlightbackground=BORDER, highlightthickness=1, **kw)
        self.label=label; self.color=color
        self._imgs=[]; self._cur=-1; self._photo=None
        self._build()

    def _build(self):
        hdr=tk.Frame(self,bg=SURFACE2,height=30); hdr.pack(fill="x"); hdr.pack_propagate(False)
        self._dot=tk.Label(hdr,text="●",fg=TEXT_MUTED,bg=SURFACE2,font=("Segoe UI",9)); self._dot.pack(side="left",padx=(8,4))
        tk.Label(hdr,text=self.label.upper(),fg=self.color,bg=SURFACE2,font=("Segoe UI",9,"bold")).pack(side="left")
        self._chip=tk.Label(hdr,text="",bg=SURFACE2,font=("Segoe UI",8,"bold"),padx=6,pady=1); self._chip.pack(side="right",padx=6,pady=4)
        self._clr=tk.Button(hdr,text="x Clear",bg=SURFACE2,fg=ACCENT_RED,relief="flat",cursor="hand2",font=("Segoe UI",8),command=self.clear,bd=0,padx=4)
        self._cv=tk.Canvas(self,bg=CAM_BG,highlightthickness=0,cursor="hand2"); self._cv.pack(fill="both",expand=True)
        self._cv.bind("<Configure>",lambda _:self._redraw())
        self._cv.bind("<Button-1>",lambda _:self._dialog())
        foot=tk.Frame(self,bg="#080f18",height=44); foot.pack(fill="x"); foot.pack_propagate(False)
        self._trow=tk.Frame(foot,bg="#080f18"); self._trow.pack(side="left",fill="y",padx=4,pady=4)
        self._cnt=tk.Label(foot,text="No images",fg=TEXT_MUTED,bg="#080f18",font=("Segoe UI",8)); self._cnt.pack(side="right",padx=8)
        tk.Button(foot,text="+ Add Images",bg=SURFACE2,fg=self.color,relief="flat",cursor="hand2",font=("Segoe UI",8,"bold"),command=self._dialog,bd=0,padx=8,pady=4).pack(side="right",padx=4,pady=6)

    def _redraw(self):
        if 0<=self._cur<len(self._imgs): self._show(self._cur)
        else: self._ph()

    def _ph(self):
        w=self._cv.winfo_width() or 360; h=self._cv.winfo_height() or 250
        self._photo=ImageTk.PhotoImage(_placeholder(w,h,self.color))
        self._cv.delete("all"); self._cv.create_image(0,0,image=self._photo,anchor="nw")

    def push_live(self, b64, status):
        try:
            pil=(_cv_b64_pil(b64) if OPENCV_OK else _b64_pil(b64))
            w=self._cv.winfo_width() or 360; h=self._cv.winfo_height() or 250
            self._photo=_pil_tk(pil,w,h)
            self._cv.delete("all"); self._cv.create_image(0,0,image=self._photo,anchor="nw")
            self._chip_set(status)
        except: pass

    def _dialog(self):
        paths=filedialog.askopenfilenames(title=f"Select images - {self.label}",
            filetypes=[("Images","*.jpg *.jpeg *.png *.bmp *.tif *.tiff"),("All","*.*")])
        if paths: self._load(list(paths))

    def _load(self, paths):
        for p in paths:
            try:
                pil=Image.open(p).convert("RGB")
                e={"path":p,"pil":pil,"status":"pending","btn":None}
                self._imgs.append(e); idx=len(self._imgs)-1
                self._add_thumb(idx)
                threading.Thread(target=self._check,args=(idx,),daemon=True).start()
            except Exception as ex: print(f"Load error {p}: {ex}")
        if self._cur<0 and self._imgs: self._select(0)
        self._upd(); self._clr.pack(side="right",padx=2)

    def _check(self, idx):
        time.sleep(0.4+random.random()*0.5)
        self._imgs[idx]["status"]="checking"
        self.after(0,self._rfth,idx)
        time.sleep(0.6+random.random()*0.4)
        if OPENCV_OK:
            try:
                arr=np.array(self._imgs[idx]["pil"])
                bgr=cv2.resize(cv2.cvtColor(arr,cv2.COLOR_RGB2BGR),(640,480))
                passed=float(cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY).mean())>20
            except: passed=random.random()>0.25
        else: passed=random.random()>0.25
        self._imgs[idx]["status"]="pass" if passed else "fail"
        self.after(0,self._rfth,idx); self.after(0,self._upd)
        if idx==self._cur: self.after(0,self._show,idx)

    def _add_thumb(self, idx):
        e=self._imgs[idx]; t=e["pil"].copy(); t.thumbnail((34,34))
        tk_t=ImageTk.PhotoImage(t); e["_tk"]=tk_t
        btn=tk.Button(self._trow,image=tk_t,bg="#080f18",relief="flat",cursor="hand2",bd=0,command=lambda i=idx:self._select(i))
        btn.image=tk_t; btn.pack(side="left",padx=2); e["btn"]=btn

    def _rfth(self, idx):
        if idx>=len(self._imgs): return
        e=self._imgs[idx]; base=e["pil"].copy(); base.thumbnail((34,34))
        d=ImageDraw.Draw(base); dots={"pass":"#22c55e","fail":ACCENT_RED,"checking":ACCENT_AMB,"pending":"#475569"}
        c=dots.get(e["status"],"#475569"); bw,bh=base.size
        d.ellipse([bw-8,bh-8,bw-1,bh-1],fill=c)
        tk_t=ImageTk.PhotoImage(base); e["_tk"]=tk_t
        if e["btn"]: e["btn"].configure(image=tk_t); e["btn"].image=tk_t

    def _select(self, idx):
        self._cur=idx; self._show(idx)
        for i,e in enumerate(self._imgs):
            if e["btn"]: e["btn"].configure(relief="solid" if i==idx else "flat",bd=1 if i==idx else 0)

    def _show(self, idx):
        if not(0<=idx<len(self._imgs)): return
        e=self._imgs[idx]; pil=e["pil"].copy()
        w=self._cv.winfo_width() or 360; h=self._cv.winfo_height() or 250
        pil.thumbnail((w,h),Image.LANCZOS)
        bg=Image.new("RGB",(w,h),CAM_BG); bg.paste(pil,((w-pil.width)//2,(h-pil.height)//2))
        d=ImageDraw.Draw(bg); st=e["status"]
        bmap={"pass":("  PASS","#22c55e","#0d3322"),"fail":("  FAIL",ACCENT_RED,"#3b1111"),
              "checking":(" Checking",ACCENT_AMB,"#3b2a00"),"pending":(" Pending",TEXT_MUTED,SURFACE2)}
        if st in bmap:
            txt,fg,bc=bmap[st]; d.rounded_rectangle([w-90,4,w-4,24],radius=4,fill=bc); d.text((w-47,14),txt,fill=fg,anchor="mm")
        d.rectangle([0,h-20,w,h],fill="#000000aa"); d.text((5,h-10),Path(e["path"]).name,fill=TEXT_SEC,anchor="lm")
        self._photo=ImageTk.PhotoImage(bg); self._cv.delete("all"); self._cv.create_image(0,0,image=self._photo,anchor="nw")
        self._chip_set(st.upper() if st in("pass","fail") else "")

    def _chip_set(self, st):
        cfg={"PASS":(ACCENT_GRN,"#16653a"),"FAIL":(ACCENT_RED,"#5a1c1c"),"CHECKING":(ACCENT_AMB,"#78350f")}
        if st in cfg:
            fg,bg=cfg[st]; self._chip.configure(text=st,fg=fg,bg=bg); self._dot.configure(fg=fg)
        else:
            self._chip.configure(text="",bg=SURFACE2); self._dot.configure(fg=TEXT_MUTED)

    def _upd(self):
        tot=len(self._imgs); ok=sum(1 for e in self._imgs if e["status"]=="pass"); fail=sum(1 for e in self._imgs if e["status"]=="fail")
        self._cnt.configure(text=f"{ok} ok  {fail} fail  /{tot}" if tot else "No images")

    def clear(self):
        self._imgs.clear()
        for w in self._trow.winfo_children(): w.destroy()
        self._cur=-1; self._upd(); self._chip_set(""); self._clr.pack_forget(); self._ph()

    def pass_count(self): return sum(1 for e in self._imgs if e["status"]=="pass")
    def fail_count(self): return sum(1 for e in self._imgs if e["status"]=="fail")

class BatchPanel(tk.Frame):
    def __init__(self, parent, **kw):
        super().__init__(parent,bg=SURFACE,highlightbackground=BORDER,highlightthickness=1,**kw)
        self._build()

    def _build(self):
        tk.Label(self,text="BATCH EFFICIENCY",fg=TEXT_MUTED,bg=SURFACE,font=("Segoe UI",9,"bold")).pack(pady=(14,2))
        self._ring=tk.Canvas(self,width=175,height=175,bg=SURFACE,highlightthickness=0); self._ring.pack()
        leg=tk.Frame(self,bg=SURFACE); leg.pack(fill="x",padx=12,pady=6)
        self._gv=self._row(leg,"#22c55e","Good Product")
        self._bv=self._row(leg,ACCENT_RED,"Rejected Product")
        pb=tk.Frame(self,bg=SURFACE); pb.pack(fill="x",padx=12,pady=(4,2))
        self._pb=tk.Canvas(pb,height=8,bg=BORDER,highlightthickness=0); self._pb.pack(fill="x")
        self._pbf=self._pb.create_rectangle(0,0,0,8,fill=ACCENT_GRN,width=0)
        self._tot=tk.Label(self,text="Total Inspected: 0",fg=TEXT_MUTED,bg=SURFACE2,font=("Segoe UI",9),padx=8,pady=5)
        self._tot.pack(fill="x",padx=10,pady=8)
        self._draw(0,0)

    def _row(self,parent,color,text):
        row=tk.Frame(parent,bg=SURFACE); row.pack(fill="x",pady=2)
        tk.Label(row,text="■",fg=color,bg=SURFACE,font=("Segoe UI",10)).pack(side="left")
        tk.Label(row,text=text,fg=TEXT_MUTED,bg=SURFACE,font=("Segoe UI",9)).pack(side="left",padx=4)
        lbl=tk.Label(row,text="0",fg=TEXT_PRI,bg=SURFACE,font=("Consolas",10,"bold")); lbl.pack(side="right")
        return lbl

    def _draw(self,accepted,defective):
        total=accepted+defective; pct=round(accepted/total*100) if total else 0
        col=ACCENT_GRN if pct>80 else(ACCENT_AMB if pct>60 else ACCENT_RED)
        c=self._ring; cx=cy=87; ro,ri=68,44; c.delete("all")
        c.create_oval(cx-ro,cy-ro,cx+ro,cy+ro,outline=BORDER,width=ro-ri,fill="")
        if total: c.create_arc(cx-ro,cy-ro,cx+ro,cy+ro,start=90,extent=-max(1,pct/100*359.9),style="arc",outline=col,width=ro-ri)
        c.create_text(cx,cy-10,text=f"{pct}%",fill=col,font=("Consolas",22,"bold"))
        c.create_text(cx,cy+12,text="EFFICIENCY",fill=TEXT_MUTED,font=("Segoe UI",7))
        self._gv.configure(text=str(accepted)); self._bv.configure(text=str(defective))
        self._tot.configure(text=f"Total Inspected: {total}")
        self._pb.update_idletasks(); bw=self._pb.winfo_width() or 180
        self._pb.coords(self._pbf,0,0,max(0,int(pct/100*bw)),8); self._pb.itemconfig(self._pbf,fill=col)

    def refresh(self,a,d): self._draw(a,d)

KPIS=[("total","No of Cones","#3b82f6"),("accepted","Accepted Cones","#10b981"),
      ("defective","Defective Cones","#ef4444"),("stain","Stain Count","#f97316"),
      ("pattern","Tube Pattern","#f59e0b"),("thread","Thread Mix","#ec4899"),("yarn","Yarn Tail","#14b8a6")]

class KPIRow(tk.Frame):
    def __init__(self,parent,**kw):
        super().__init__(parent,bg=BG,**kw); self._lbls={}
        for key,label,color in KPIS:
            card=tk.Frame(self,bg=SURFACE,padx=10,pady=8,highlightbackground=BORDER,highlightthickness=1)
            card.pack(side="left",expand=True,fill="both",padx=3)
            tk.Frame(card,bg=color,width=20,height=4).pack(anchor="w",pady=(0,4))
            val=tk.Label(card,text="0",fg=color,bg=SURFACE,font=("Consolas",17,"bold")); val.pack(anchor="w")
            tk.Label(card,text=label.upper(),fg=TEXT_MUTED,bg=SURFACE,font=("Segoe UI",7,"bold")).pack(anchor="w")
            self._lbls[key]=val

    def refresh(self,kpi):
        m={"total":kpi.total,"accepted":kpi.accepted,"defective":kpi.defective,
           "stain":kpi.stain,"pattern":kpi.pattern_fail,"thread":kpi.thread_mix,"yarn":kpi.yarn_miss}
        for k,v in m.items(): self._lbls[k].configure(text=str(v))

class ControlBar(tk.Frame):
    def __init__(self,parent,on_start,on_stop,on_reset,**kw):
        super().__init__(parent,bg=SURFACE2,**kw)
        self._on_start=on_start; self._on_stop=on_stop; self._on_reset=on_reset
        self._build()

    def _build(self):
        left=tk.Frame(self,bg=SURFACE2); left.pack(side="left",padx=12)
        self._dot=tk.Label(left,text="●",fg=TEXT_MUTED,bg=SURFACE2,font=("Segoe UI",12)); self._dot.pack(side="left",padx=(0,6))
        self._stl=tk.Label(left,text="SYSTEM IDLE",fg=TEXT_MUTED,bg=SURFACE2,font=("Segoe UI",9,"bold")); self._stl.pack(side="left")
        right=tk.Frame(self,bg=SURFACE2); right.pack(side="right",padx=8)
        tb=tk.Frame(right,bg="#111c2a",padx=10,pady=5); tb.pack(side="left",padx=8)
        tk.Label(tb,text="INSPECTION TIME:",fg=TEXT_MUTED,bg="#111c2a",font=("Segoe UI",8,"bold")).pack(side="left")
        self._tl=tk.Label(tb,text="00:00:00",fg=TEXT_MUTED,bg="#111c2a",font=("Consolas",15,"bold")); self._tl.pack(side="left",padx=(8,0))
        tk.Button(right,text="Reset",bg=SURFACE,fg=TEXT_PRI,relief="flat",cursor="hand2",font=("Segoe UI",9,"bold"),padx=10,pady=5,command=self._on_reset,bd=0).pack(side="left",padx=4)
        self._sb=tk.Button(right,text="  Start Inspection",bg=ACCENT_GRN,fg="#fff",relief="flat",cursor="hand2",font=("Segoe UI",9,"bold"),padx=14,pady=5,command=self._on_start,bd=0)
        self._sb.pack(side="left",padx=4)
        self._xb=tk.Button(right,text="  Stop",bg=ACCENT_RED,fg="#fff",relief="flat",cursor="hand2",font=("Segoe UI",9,"bold"),padx=14,pady=5,command=self._on_stop,bd=0)

    def set_running(self,r):
        if r:
            self._sb.pack_forget(); self._xb.pack(side="left",padx=4)
            self._dot.configure(fg=ACCENT_GRN); self._stl.configure(text="LIVE INSPECTION",fg=ACCENT_GRN); self._tl.configure(fg=ACCENT_GRN)
        else:
            self._xb.pack_forget(); self._sb.pack(side="left",padx=4)
            self._dot.configure(fg=TEXT_MUTED); self._stl.configure(text="SYSTEM IDLE",fg=TEXT_MUTED); self._tl.configure(fg=TEXT_MUTED)

    def update_time(self,t): self._tl.configure(text=t)

class InspectApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("SIEGER - Cone Inspection System"); self.configure(bg=BG)
        self.geometry("1440x860"); self.minsize(1100,680)
        lp=Path(__file__).parent/"logo.png"
        if lp.exists():
            try: self._icon=ImageTk.PhotoImage(Image.open(lp).resize((32,32))); self.iconphoto(True,self._icon)
            except: pass
        self._kpi=KPI(); self._running=False
        self._pipeline=InspectionPipeline() if PIPELINE_OK else None
        self._stop=threading.Event()
        self._build(); self._tick()

    def _build(self):
        hdr=tk.Frame(self,bg="#0b1520",height=52); hdr.pack(fill="x"); hdr.pack_propagate(False)
        lp=Path(__file__).parent/"logo.png"
        if lp.exists():
            try:
                limg=Image.open(lp).convert("RGBA"); limg.thumbnail((110,42))
                self._hl=ImageTk.PhotoImage(limg); tk.Label(hdr,image=self._hl,bg="#0b1520").pack(side="left",padx=14)
            except: tk.Label(hdr,text="SIEGER",fg=ACCENT_GRN,bg="#0b1520",font=("Segoe UI",15,"bold")).pack(side="left",padx=14)
        else: tk.Label(hdr,text="SIEGER",fg=ACCENT_GRN,bg="#0b1520",font=("Segoe UI",15,"bold")).pack(side="left",padx=14)
        tk.Label(hdr,text="Cone Inspection System",fg=TEXT_MUTED,bg="#0b1520",font=("Segoe UI",9)).pack(side="left")
        self._clk=tk.Label(hdr,text="",fg=TEXT_PRI,bg="#0b1520",font=("Consolas",13,"bold")); self._clk.pack(side="right",padx=16)
        self._ctrl=ControlBar(self,on_start=self._start,on_stop=self._xstop,on_reset=self._reset,height=50)
        self._ctrl.pack(fill="x"); self._ctrl.pack_propagate(False)
        self._krow=KPIRow(self); self._krow.pack(fill="x",padx=6,pady=5)
        tk.Frame(self,bg=BORDER,height=1).pack(fill="x")
        main=tk.Frame(self,bg=BG); main.pack(fill="both",expand=True,padx=6,pady=6)
        ca=tk.Frame(main,bg=BG); ca.pack(side="left",fill="both",expand=True)
        self._vis=CameraPanel(ca,label="Visible Camera",color=ACCENT_GRN)
        self._uv=CameraPanel(ca,label="UV Camera",color=ACCENT_PUR)
        self._yarn=CameraPanel(ca,label="Yarn Tail Camera",color=ACCENT_BLU)
        for cam in(self._vis,self._uv,self._yarn): cam.pack(side="left",fill="both",expand=True,padx=3)
        self._batch=BatchPanel(main,width=225); self._batch.pack(side="right",fill="y",padx=(6,0)); self._batch.pack_propagate(False)

    def _start(self):
        if self._running: return
        self._running=True; self._kpi.start_time=time.time(); self._ctrl.set_running(True); self._stop.clear()
        if self._pipeline: threading.Thread(target=self._loop,daemon=True).start()

    def _xstop(self):
        self._running=False; self._stop.set(); self._kpi.start_time=None; self._ctrl.set_running(False)

    def _reset(self):
        self._kpi.reset(); self._krow.refresh(self._kpi); self._batch.refresh(0,0); self._ctrl.update_time("00:00:00")

    def _loop(self):
        while not self._stop.is_set():
            try:
                r=self._pipeline.process_cone(); self._kpi.total+=1
                if r["status"]=="PASS": self._kpi.accepted+=1
                else: self._kpi.defective+=1
                for d in r.get("defects",[]):
                    t=d["type"]
                    if t=="stain": self._kpi.stain+=1
                    elif t=="pattern_fail": self._kpi.pattern_fail+=1
                    elif t=="thread_mix": self._kpi.thread_mix+=1
                    elif t=="yarn_tail_missing": self._kpi.yarn_miss+=1
                self.after(0,self._frame,r["frames"],r["status"])
            except Exception as e: print(f"[pipeline] {e}")
            self._stop.wait(0.5)

    def _frame(self,frames,status):
        if not self._running: return
        if frames.get("visible"): self._vis.push_live(frames["visible"],status)
        if frames.get("uv"): self._uv.push_live(frames["uv"],status)
        if frames.get("yarn_tail"): self._yarn.push_live(frames["yarn_tail"],status)
        self._krow.refresh(self._kpi); self._batch.refresh(self._kpi.accepted,self._kpi.defective)

    def _tick(self):
        self._clk.configure(text=time.strftime("  %H:%M:%S  "))
        self._ctrl.update_time(self._kpi.elapsed)
        if not self._running:
            ok=self._vis.pass_count()+self._uv.pass_count()+self._yarn.pass_count()
            fail=self._vis.fail_count()+self._uv.fail_count()+self._yarn.fail_count()
            self._batch.refresh(ok,fail)
        self.after(500,self._tick)

if __name__=="__main__":
    InspectApp().mainloop()
