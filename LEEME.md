# NEXOCHECKSTUDIO — Etapa 1

## Qué es esto

Esta es la primera versión de la plataforma: login, registro, creación de tu
organización, creación de obras y un dashboard base. Todavía no hay carga de
planos ni análisis con IA — eso empieza en Etapa 2.

## Paso 1 — Cargar el esquema en Supabase

1. Entrá a tu proyecto `nexocheckstudio` en supabase.com
2. En el menú izquierdo, tocá **SQL Editor**
3. Tocá **New query**
4. Abrí el archivo `supabase/etapa1_schema.sql` de esta carpeta, copiá todo el contenido
5. Pegalo en el editor y tocá **Run**
6. Debería decir "Success. No rows returned" — eso está bien, son solo tablas

## Paso 2 — Subir el código a GitHub

1. Entrá al repositorio `nexocheckstudio` que ya creaste en GitHub
2. Como está vacío, vas a ver un link que dice **"uploading an existing file"** — tocalo
   (si no lo ves, tocá "Add file" → "Upload files")
3. Arrastrá **todos los archivos y carpetas** de este proyecto (menos `node_modules`,
   que no existe todavía, así que no hay problema)
4. Abajo, en "Commit changes", dejá el mensaje por defecto y tocá **"Commit changes"**

## Paso 3 — Conectar con Vercel

1. Entrá a vercel.com con tu cuenta
2. Tocá **"Add New" → "Project"**
3. Elegí el repositorio `nexocheckstudio`
4. Antes de tocar "Deploy", abrí la sección **"Environment Variables"**
5. Agregá estas dos variables (los valores están en Supabase → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL` → el "Project URL"
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la "anon public" key
6. Tocá **"Deploy"** y esperá 1-2 minutos

## Paso 4 — Probar

1. Abrí la URL que te dio Vercel
2. Creá tu cuenta desde "Crear cuenta"
3. Confirmá el correo (revisá spam si no llega)
4. Iniciá sesión, creá tu organización, y creá una obra de prueba

Cuando lo hayas probado, decime "Listo" y seguimos con Etapa 2 (carga de PDF y visor de planos).
