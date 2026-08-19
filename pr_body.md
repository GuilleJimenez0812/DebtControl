Resolves #120.

Se ha implementado el soporte en la base de datos y la capa de dominio (Go) para el control de acceso por módulos.
- Nueva tabla `user_modules`.
- Relación GORM y campo `Modules` agregado en `User`.
- `AssignModulesToUser` implementado en el backend y habilitado bajo la ruta PUT de admin.
