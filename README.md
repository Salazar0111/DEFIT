# DEFIT

PWA para contar calorías, llevar el peso y competir con amigos en retos de cumplimiento calórico.

Producción: https://defit-eta.vercel.app

## Stack

- **Frontend:** React 18 + Vite, `motion` para animaciones, `lucide-react` para íconos, Recharts para la gráfica de peso.
- **Backend:** Supabase (proyecto `defit`): Auth, Postgres con RLS, Realtime, Edge Functions, pg_cron y Vault.
- **IA:** `api/analyze.js` (función de Vercel) estima calorías y macros con Claude a partir de una foto o un texto.
- **Push:** service worker (`public/sw.js`) + Web Push con claves VAPID.

## Estructura

```
api/analyze.js              Estimación con IA (exige sesión y cuota diaria)
public/avatars/a1..a8.svg   Avatares (reemplazables con el mismo nombre)
public/medals/<id>.svg      Arte de medallas (opcional, ver src/lib/medals.js)
public/sw.js                Service worker de notificaciones
src/App.jsx                 Sesión, cuestionario inicial y navegación
src/screens/                Hoy, Comida, Peso, Retos, Perfil, cuestionario, login
src/components/             Shell, Sheet, Avatar, Medal, Reminders
src/lib/                    Supabase, plan calórico, comidas, retos, push, paletas
src/styles/tokens.css       Sistema visual: tres paletas y liquid glass
supabase/migrations/        Esquema completo de la base de datos
supabase/functions/reminders/  Recordatorios y avisos de retos
```

## Cómo funciona

- **Registro cerrado:** solo pueden registrarse los correos de `public.allowed_emails`. Para sumar a alguien:
  ```sql
  insert into public.allowed_emails (email, note) values ('correo@ejemplo.com', 'Nombre');
  ```
- **Plan calórico** (`src/lib/plan.js`): Mifflin-St Jeor, ajuste de ±4% por contextura, factor de actividad
  (1,2 / 1,55 / 1,725) y déficit en comida de 0, 600, 800 o 1.000 kcal.
- **Día cumplido:** entre 90% y 110% de la meta. Se usa en retos y medallas.
- **Retos:** se crean y responden solo con las funciones `create_challenge`, `respond_challenge` y `cancel_challenge`.
  Los rivales ven los totales de `daily_totals`, nunca las comidas. Mientras hay un reto pendiente o activo,
  el trigger `guard_plan_changes` bloquea el plan.
- **Cierre diario:** `daily_close()` corre con pg_cron a las 00:05 de Colombia. Cierra retos, define ganadores y entrega medallas.
- **Recordatorios:** pg_cron llama cada 5 minutos a la Edge Function `reminders`, que avisa solo si falta registrar algo.
  En iPhone las notificaciones exigen instalar la app en la pantalla de inicio.
- **Zona horaria:** todo se calcula en `America/Bogota`.

## Desarrollo local

```bash
npm install
npm run dev
```

- `http://localhost:5173/?demo` muestra la app con datos ficticios, sin iniciar sesión.
- `http://localhost:5173/?demo=nuevo` arranca desde el cuestionario inicial.
- El endpoint de IA (`/api`) solo corre en Vercel o con `vercel dev`.

Variables en `.env` (no se sube a git):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

En Vercel además: `ANTHROPIC_API_KEY`. En los secrets de Supabase: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT` y `CRON_SECRET`. El mismo `CRON_SECRET` está en Vault como `reminders_cron_secret`.

## Base de datos

```bash
supabase link --project-ref hlixfgtotelmytgjsprb
supabase db push
supabase functions deploy reminders --use-api
```

Los jobs de pg_cron (`defit-reminders` y `defit-daily-close`) y el secreto de Vault se crearon a mano porque contienen el secreto. Ver `supabase/migrations/20260930233000_cron.sql`.
