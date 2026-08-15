# NEXOCHECKSTUDIO — Proyecto completo

Este zip contiene el código completo del proyecto tal como está funcionando
en nexocheckstudio.vercel.app al momento de generarlo.

## IMPORTANTE sobre cómo subir esto a GitHub desde iPad

La vez anterior que probamos con zip, Safari "aplastó" las carpetas al
subirlas y se generó un quilombo. Para que esta vez funcione:

1. Extraé el zip en la app Archivos del iPad (mantené presionado el zip → "Descomprimir")
2. Andá a tu repo en GitHub → "Add file" → "Upload files"
3. **Desde la app Archivos**, entrá a la carpeta ya descomprimida `nexocheckstudio_full`
4. Seleccioná **todo el contenido de adentro** (no la carpeta en sí) usando "Seleccionar" arriba a la derecha en Archivos, y elegí todos los archivos y subcarpetas
5. Arrastralos TODOS JUNTOS a la zona de carga de GitHub en un solo gesto (esto es clave: si los arrastrás de a uno o en tandas separadas, algunas carpetas se pueden aplanar)
6. Antes de confirmar el commit, revisá en la vista previa de GitHub que las carpetas `app`, `components`, `lib` aparezcan como carpetas (con el ícono de carpeta), no como si todos los archivos quedaran sueltos

Si after subir algo se ve mal (archivos sueltos que deberían estar en una
carpeta), es más fácil corregirlo archivo por archivo como veníamos
haciendo, que reintentar el zip entero de nuevo.

## Variables de entorno necesarias en Vercel

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- ANTHROPIC_API_KEY (marcada como Sensitive)

## Buckets de Supabase Storage necesarios

- `documentos` (privado)
