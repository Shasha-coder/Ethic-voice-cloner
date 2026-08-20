import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import dashscope
import sqlite3
import os
from datetime import datetime
import base64
import re

# ====================== SQLite Setup ======================
def init_db():
    conn = sqlite3.connect('voices.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS voices
                 (id INTEGER PRIMARY KEY,
                  voice_name TEXT,
                  voice_id TEXT,
                  model TEXT,
                  date TEXT,
                  description TEXT)''')
    conn.commit()
    conn.close()

# ====================== Premium Style ======================
class PremiumVoiceCloner:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Qwen Voice Studio")
        self.root.geometry("1050x720")
        
        # Premium Dark Palette (Minimalist Zinc/Indigo)
        self.colors = {
            "bg": "#09090b",           # Zinc 950
            "surface": "#18181b",      # Zinc 900
            "surface_hover": "#27272a",# Zinc 800
            "border": "#27272a",       # Zinc 800
            "primary": "#6366f1",      # Indigo 500
            "primary_hover": "#4f46e5",# Indigo 600
            "text": "#fafafa",         # Zinc 50
            "text_muted": "#a1a1aa",   # Zinc 400
        }
        
        self.root.configure(bg=self.colors["bg"])
        self.root.resizable(True, True)
        
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.configure_styles()
        
        init_db()
        self.create_widgets()

    def configure_styles(self):
        # Treeview styling
        self.style.configure("Treeview", 
                        background=self.colors["surface"],
                        foreground=self.colors["text"],
                        fieldbackground=self.colors["surface"],
                        rowheight=40,
                        borderwidth=0,
                        font=("Segoe UI", 10))
        
        self.style.map('Treeview', 
                  background=[('selected', self.colors["surface_hover"])],
                  foreground=[('selected', self.colors["primary"])])
                  
        self.style.configure("Treeview.Heading",
                        background=self.colors["bg"],
                        foreground=self.colors["text_muted"],
                        borderwidth=0,
                        font=("Segoe UI", 10, "bold"),
                        padding=(10, 15))
                        
        self.style.map("Treeview.Heading",
                  background=[('active', self.colors["bg"])])

        # Combobox
        self.style.configure("TCombobox", 
                        fieldbackground=self.colors["bg"], 
                        background=self.colors["surface"], 
                        foreground=self.colors["text"],
                        bordercolor=self.colors["border"],
                        arrowcolor=self.colors["text"])
                        
        # Scrollbar
        self.style.configure("Vertical.TScrollbar",
                        background=self.colors["surface_hover"],
                        troughcolor=self.colors["surface"],
                        bordercolor=self.colors["surface"],
                        arrowcolor=self.colors["text_muted"])

    def create_widgets(self):
        # Main Container
        container = tk.Frame(self.root, bg=self.colors["bg"])
        container.pack(fill="both", expand=True, padx=40, pady=30)
        
        container.columnconfigure(0, weight=1)
        container.rowconfigure(2, weight=1)

        # ---- Top Section: Header & API Key ----
        top_frame = tk.Frame(container, bg=self.colors["bg"])
        top_frame.grid(row=0, column=0, sticky="ew", pady=(0, 30))
        top_frame.columnconfigure(1, weight=1)
        
        # Title
        title_frame = tk.Frame(top_frame, bg=self.colors["bg"])
        title_frame.grid(row=0, column=0, sticky="w")
        
        tk.Label(title_frame, text="Qwen Studio", 
                font=("Segoe UI Variable Display", 24, "bold"), 
                bg=self.colors["bg"], fg=self.colors["text"]).pack(side="left")
                
        tk.Label(title_frame, text="VOICE CLONING", 
                font=("Segoe UI", 10, "bold"), 
                bg=self.colors["bg"], fg=self.colors["primary"]).pack(side="left", padx=15, pady=7)

        # API Key (Right aligned in header)
        api_frame = tk.Frame(top_frame, bg=self.colors["bg"])
        api_frame.grid(row=0, column=2, sticky="e")
        
        # Region selector
        tk.Label(api_frame, text="REGION", font=("Segoe UI", 9, "bold"), 
                 bg=self.colors["bg"], fg=self.colors["text_muted"]).pack(side="left", padx=(0, 5))
        self.region_var = tk.StringVar(value="International")
        region_combo = ttk.Combobox(api_frame, textvariable=self.region_var, 
                                    values=["International", "China"], 
                                    font=("Segoe UI", 10), state="readonly", width=13)
        region_combo.pack(side="left", padx=(0, 15), ipady=4)

        tk.Label(api_frame, text="API KEY", font=("Segoe UI", 9, "bold"), 
                 bg=self.colors["bg"], fg=self.colors["text_muted"]).pack(side="left", padx=(0, 10))
                 
        self.api_entry = tk.Entry(api_frame, show="•", font=("Segoe UI", 11), width=30,
                                 bg=self.colors["surface"], fg=self.colors["text"], 
                                 insertbackground=self.colors["text"], 
                                 relief="flat", highlightthickness=1, 
                                 highlightbackground=self.colors["border"], 
                                 highlightcolor=self.colors["primary"])
        self.api_entry.pack(side="left", ipady=7, padx=(0, 10))
        
        save_btn = tk.Button(api_frame, text="Save", font=("Segoe UI", 10, "bold"),
                             bg=self.colors["surface"], fg=self.colors["text"],
                             relief="flat", cursor="hand2", command=self.save_api_key,
                             activebackground=self.colors["surface_hover"], 
                             activeforeground=self.colors["text"], padx=15, pady=6)
        save_btn.pack(side="left")

        # ---- Form & Upload Section ----
        middle_frame = tk.Frame(container, bg=self.colors["bg"])
        middle_frame.grid(row=1, column=0, sticky="ew", pady=(0, 30))
        middle_frame.columnconfigure(0, weight=2)
        middle_frame.columnconfigure(1, weight=1)

        # Inputs
        form_frame = tk.Frame(middle_frame, bg=self.colors["surface"], padx=30, pady=25)
        form_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 20))
        form_frame.columnconfigure(1, weight=1)
        
        tk.Label(form_frame, text="Create New Voice", font=("Segoe UI", 14, "bold"), 
                 bg=self.colors["surface"], fg=self.colors["text"]).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 20))

        self.name_entry = self.create_input(form_frame, "Voice Name", 1)
        self.desc_entry = self.create_input(form_frame, "Description", 2)
        
        tk.Label(form_frame, text="Target Model", font=("Segoe UI", 10), bg=self.colors["surface"], fg=self.colors["text_muted"]).grid(row=3, column=0, sticky="w", pady=(10, 0))
        self.model_var = tk.StringVar(value="qwen3.5-omni-plus-realtime")
        models = ["qwen3.5-omni-plus-realtime", "qwen3.5-omni-flash-realtime"]
        model_combo = ttk.Combobox(form_frame, textvariable=self.model_var, values=models, font=("Segoe UI", 11), state="readonly")
        model_combo.grid(row=3, column=1, sticky="ew", pady=(10, 0), ipady=6)

        # Upload Button
        upload_frame = tk.Frame(middle_frame, bg=self.colors["surface"], padx=30, pady=30)
        upload_frame.grid(row=0, column=1, sticky="nsew")
        
        tk.Label(upload_frame, text="Audio Sample", font=("Segoe UI", 14, "bold"), 
                 bg=self.colors["surface"], fg=self.colors["text"]).pack(anchor="w", pady=(0, 15))
                 
        tk.Label(upload_frame, text="Upload a clean audio file without\nbackground noise for best results.", 
                 font=("Segoe UI", 10), bg=self.colors["surface"], fg=self.colors["text_muted"], justify="left").pack(anchor="w", pady=(0, 25))

        upload_btn = tk.Button(upload_frame, text="Upload & Clone", 
                              font=("Segoe UI", 12, "bold"), bg=self.colors["primary"], fg="white", 
                              relief="flat", cursor="hand2", command=self.upload_and_clone,
                              activebackground=self.colors["primary_hover"], activeforeground="white")
        upload_btn.pack(fill="both", expand=True)
        
        # Button Hover Effect
        upload_btn.bind("<Enter>", lambda e: upload_btn.config(bg=self.colors["primary_hover"]))
        upload_btn.bind("<Leave>", lambda e: upload_btn.config(bg=self.colors["primary"]))

        # ---- History Section ----
        library_frame = tk.Frame(container, bg=self.colors["surface"], padx=30, pady=25)
        library_frame.grid(row=2, column=0, sticky="nsew")
        
        tk.Label(library_frame, text="Voice Library", font=("Segoe UI", 14, "bold"), 
                 bg=self.colors["surface"], fg=self.colors["text"]).pack(anchor="w", pady=(0, 15))

        tree_container = tk.Frame(library_frame, bg=self.colors["surface"])
        tree_container.pack(fill="both", expand=True)
        
        columns = ("ID", "Voice Name", "Voice ID", "Model", "Date", "Description")
        self.tree = ttk.Treeview(tree_container, columns=columns, show="headings", style="Treeview")
        
        for col in columns:
            self.tree.heading(col, text=col.upper())
            width = 60 if col == "ID" else 150 if col in ("Voice Name", "Model") else 120 if col == "Date" else 250
            self.tree.column(col, width=width, anchor="w")

        scrollbar = ttk.Scrollbar(tree_container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self.load_history()

    def create_input(self, parent, label_text, row):
        tk.Label(parent, text=label_text, font=("Segoe UI", 10), bg=self.colors["surface"], fg=self.colors["text_muted"]).grid(row=row, column=0, sticky="w", pady=(10, 10), padx=(0, 20))
        entry = tk.Entry(parent, font=("Segoe UI", 11), bg=self.colors["bg"], fg=self.colors["text"], 
                         insertbackground=self.colors["text"], relief="flat", highlightthickness=1, 
                         highlightbackground=self.colors["border"], highlightcolor=self.colors["primary"])
        entry.grid(row=row, column=1, sticky="ew", pady=(10, 10), ipady=7)
        return entry

    def save_api_key(self):
        key = self.api_entry.get().strip()
        if key:
            dashscope.api_key = key
            messagebox.showinfo("Success", "API Key saved successfully!")
        else:
            messagebox.showwarning("Warning", "Please enter your API Key")

    def upload_and_clone(self):
        # Grab API key directly from the entry field
        api_key = self.api_entry.get().strip()
        if not api_key:
            messagebox.showerror("Error", "Please enter your API Key first")
            return
        dashscope.api_key = api_key

        # Set endpoint based on region
        region = self.region_var.get()
        if region == "International":
            dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"
        else:
            dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"

        file_path = filedialog.askopenfilename(
            filetypes=[("Audio Files", "*.wav *.mp3 *.m4a *.ogg")]
        )
        if not file_path:
            return

        voice_name = self.name_entry.get().strip()
        description = self.desc_entry.get().strip() or "No description"
        target_model = self.model_var.get()

        if not voice_name:
            messagebox.showerror("Error", "Voice Name is required")
            return

        # Sanitize prefix: lowercase alphanumeric only, max 10 chars
        prefix = re.sub(r'[^a-z0-9]', '', voice_name.lower())[:10]
        if not prefix:
            prefix = "voice"

        try:
            import requests as req

            # Step 1: Upload audio file to temporary public storage (catbox.moe)
            # This bypasses Alibaba OSS DNS blocking issues from outside China
            with open(file_path, "rb") as f:
                catbox_resp = req.post(
                    "https://catbox.moe/user/api.php",
                    data={"reqtype": "fileupload"},
                    files={"fileToUpload": f},
                    timeout=120
                )
            
            if catbox_resp.status_code != 200:
                raise Exception(f"Failed to upload audio to temp storage: {catbox_resp.text}")
            
            audio_url = catbox_resp.text.strip()

            # Step 2: Call voice enrollment API with the public URL
            base_url = dashscope.base_http_api_url
            url = f"{base_url}/services/audio/tts/customization"

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "model": "voice-enrollment",
                "input": {
                    "action": "create_voice",
                    "target_model": target_model,
                    "prefix": prefix,
                    "url": audio_url,
                }
            }

            resp = req.post(url, json=payload, headers=headers, timeout=120)
            result = resp.json()

            if resp.status_code == 200 and "output" in result:
                voice_id = result["output"]["voice_id"]
            else:
                error_msg = result.get("message", result.get("code", str(result)))
                raise Exception(f"API Error ({resp.status_code}): {error_msg}")
            self.save_to_db(voice_name, voice_id, target_model, description)
            
            messagebox.showinfo("✅ Voice Cloned Successfully", f"Voice ID: {voice_id}")
            self.load_history()

        except Exception as e:
            messagebox.showerror("Cloning Failed", str(e))

    def save_to_db(self, voice_name, voice_id, model, description):
        conn = sqlite3.connect('voices.db')
        c = conn.cursor()
        c.execute("""INSERT INTO voices (voice_name, voice_id, model, date, description) 
                     VALUES (?, ?, ?, ?, ?)""",
                  (voice_name, voice_id, model, datetime.now().strftime("%Y-%m-%d %H:%M"), description))
        conn.commit()
        conn.close()

    def load_history(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        conn = sqlite3.connect('voices.db')
        c = conn.cursor()
        c.execute("SELECT * FROM voices ORDER BY date DESC")
        for row in c.fetchall():
            self.tree.insert("", "end", values=row)
        conn.close()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = PremiumVoiceCloner()
    app.run()
