# ⚡ FitPlan

Tu app personal de fitness y nutrición. Análisis de comidas con IA, rutinas, control de peso y alertas.

---

## 🚀 Deploy en Vercel (5 pasos)

### 1. Necesitas
- Cuenta en [github.com](https://github.com) (gratis)
- Cuenta en [vercel.com](https://vercel.com) (gratis)
- API Key de Anthropic → [console.anthropic.com](https://console.anthropic.com)

### 2. Sube el proyecto a GitHub
1. Ve a github.com → **New repository** → nombre: `fitplan` → Create
2. Descarga [GitHub Desktop](https://desktop.github.com) o usa la web
3. Sube todos estos archivos al repositorio

### 3. Conecta Vercel con GitHub
1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa tu repositorio `fitplan`
3. Framework: **Vite** (se detecta automático)
4. Click **Deploy**

### 4. Agrega tu API Key de Anthropic
1. En Vercel → tu proyecto → **Settings** → **Environment Variables**
2. Agrega:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** tu API key (empieza con `sk-ant-...`)
3. Click **Save** → luego **Redeploy**

### 5. Instala en tu celular
1. Abre la URL de tu app en Safari (iPhone) o Chrome (Android)
2. Toca **Compartir** (⬆️) → **Agregar a pantalla de inicio**
3. ¡Listo! Tienes el ícono como una app nativa

---

## 📱 Funcionalidades

- **📸 Foto** — Toma foto de tu comida, Claude AI calcula los macros
- **🔍 Buscar** — Escribe "200g arroz blanco" y Claude estima los macros
- **✏️ Manual** — Ingresa nombre + calorías + macros directamente
- **💪 Rutina** — Checklist Push/Pull/Legs/Upper/Lower+Core
- **📈 Peso** — Registro con gráfica de evolución
- **🔔 Alertas** — Recordatorios de entreno y comidas

---

## 🔑 Obtener API Key de Anthropic

1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Crea una cuenta
3. **API Keys** → **Create Key**
4. Copia la key (empieza con `sk-ant-api03-...`)

> El análisis de fotos cuesta ~$0.002 por foto (casi nada). Con $5 puedes analizar ~2500 fotos.

---

## 🛠 Desarrollo local

```bash
npm install
npm run dev
```

Visita `http://localhost:5173`

> Para desarrollo local, crea un archivo `.env.local` con:
> `ANTHROPIC_API_KEY=sk-ant-...`
