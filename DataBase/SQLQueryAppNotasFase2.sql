-- Si la base existe, poner en SINGLE_USER para poder borrar objetos
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'NotesAppDb')
BEGIN
    ALTER DATABASE [NotesAppDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
END
GO

-- Crear base si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'NotesAppDb')
BEGIN
    CREATE DATABASE [NotesAppDb];
    PRINT 'Base de datos NotesAppDb creada.';
END
ELSE
    PRINT 'La base de datos NotesAppDb ya existe.';
GO

USE [NotesAppDb];
GO

-- Borrar tablas si existen (para desarrollo)
IF OBJECT_ID('dbo.NoteCategories', 'U') IS NOT NULL DROP TABLE dbo.NoteCategories;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.Notes', 'U') IS NOT NULL DROP TABLE dbo.Notes;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- Tabla de notas
CREATE TABLE dbo.Notes (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Notes PRIMARY KEY DEFAULT NEWID(),
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NULL,
    Archived BIT NOT NULL CONSTRAINT DF_Notes_Archived DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notes_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notes_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

-- Tabla de categorías
CREATE TABLE dbo.Categories (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Categories PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL UNIQUE
);
GO

-- Relación muchos a muchos entre notas y categorías
CREATE TABLE dbo.NoteCategories (
    NoteId     UNIQUEIDENTIFIER NOT NULL
      CONSTRAINT FK_NoteCategories_Notes FOREIGN KEY REFERENCES dbo.Notes(Id) ON DELETE CASCADE,
    CategoryId UNIQUEIDENTIFIER NOT NULL
      CONSTRAINT FK_NoteCategories_Categories FOREIGN KEY REFERENCES dbo.Categories(Id) ON DELETE CASCADE,
    CONSTRAINT PK_NoteCategories PRIMARY KEY (NoteId, CategoryId)
);
GO

-- Tabla de usuarios (Password en texto plano para pruebas)
CREATE TABLE dbo.Users (
    Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWID(),
    UserName     NVARCHAR(100)    NOT NULL UNIQUE,
    Password     NVARCHAR(100)    NOT NULL -- TEXTO PLANO
);
GO

-- === Datos de prueba ===

INSERT INTO dbo.Notes (Id, Title, Content, Archived)
VALUES
  (NEWID(), N'Lista de compras', N'Leche, pan, huevos, café', 0),
  (NEWID(), N'Tareas del día', N'1. Llamar al banco' + CHAR(13) + CHAR(10) + N'2. Enviar informe', 0),
  (NEWID(), N'Proyecto ASP.NET', N'Configurar Web API y ADO.NET', 1);
GO

INSERT INTO dbo.Categories (Name)
VALUES (N'work'), (N'personal'), (N'ideas');
GO

-- Asociar notas y categorías de prueba
INSERT INTO dbo.NoteCategories (NoteId, CategoryId)
SELECT n.Id, c.Id
  FROM dbo.Notes n
  JOIN dbo.Categories c ON c.Name = N'work'
 WHERE n.Title = N'Proyecto ASP.NET';

INSERT INTO dbo.NoteCategories (NoteId, CategoryId)
SELECT n.Id, c.Id
  FROM dbo.Notes n
  JOIN dbo.Categories c ON c.Name = N'personal'
 WHERE n.Title = N'Tareas del día';
GO

-- Usuario admin (clave: admin en texto plano)
INSERT INTO dbo.Users (UserName, Password)
VALUES (N'admin', N'admin');
GO

-- === OPCIÓN: DESHABILITAR TODOS LOS TRIGGERS EN LA TABLA Notes ===
-- Esto evita el error de EF Core al usar OUTPUT en UPDATE cuando hay triggers
-- Debe ir después de crear la tabla y el trigger

-- Primero, si existe, borra el trigger por si quedó de antes
DROP TRIGGER IF EXISTS dbo.TR_Notes_UpdateTimestamp;
GO

-- Crear trigger (queda deshabilitado por defecto por la línea de abajo)
CREATE TRIGGER dbo.TR_Notes_UpdateTimestamp
ON dbo.Notes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE n
       SET UpdatedAt = SYSUTCDATETIME()
      FROM dbo.Notes n
      JOIN inserted i ON n.Id = i.Id;
END;
GO

-- Deshabilita el trigger para evitar conflicto con OUTPUT (EF Core)
DISABLE TRIGGER ALL ON dbo.Notes;
GO
-- Si querés volver a habilitarlos después, descomentá:
-- ENABLE TRIGGER ALL ON dbo.Notes;
-- GO

-- === Stored Procedures ===

-- CRUD Notes
IF OBJECT_ID('dbo.sp_GetNotes', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetNotes;
GO
CREATE PROCEDURE dbo.sp_GetNotes
  @Archived BIT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, Title, Content, Archived, CreatedAt, UpdatedAt
    FROM dbo.Notes
   WHERE Archived = @Archived
   ORDER BY CreatedAt DESC;
END;
GO

IF OBJECT_ID('dbo.sp_GetNoteById', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetNoteById;
GO
CREATE PROCEDURE dbo.sp_GetNoteById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, Title, Content, Archived, CreatedAt, UpdatedAt
    FROM dbo.Notes
   WHERE Id = @Id;
END;
GO

IF OBJECT_ID('dbo.sp_CreateNote', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CreateNote;
GO
CREATE PROCEDURE dbo.sp_CreateNote
  @Title   NVARCHAR(200),
  @Content NVARCHAR(MAX),
  @NewId   UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET @NewId = NEWID();
  INSERT INTO dbo.Notes (Id, Title, Content)
       VALUES (@NewId, @Title, @Content);
END;
GO

IF OBJECT_ID('dbo.sp_UpdateNote', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_UpdateNote;
GO
CREATE PROCEDURE dbo.sp_UpdateNote
  @Id      UNIQUEIDENTIFIER,
  @Title   NVARCHAR(200),
  @Content NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.Notes
     SET Title     = @Title,
         Content   = @Content,
         UpdatedAt = SYSUTCDATETIME()
   WHERE Id = @Id;
END;
GO

IF OBJECT_ID('dbo.sp_DeleteNote', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_DeleteNote;
GO
CREATE PROCEDURE dbo.sp_DeleteNote
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM dbo.Notes
   WHERE Id = @Id;
END;
GO

IF OBJECT_ID('dbo.sp_SetNoteArchive', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_SetNoteArchive;
GO
CREATE PROCEDURE dbo.sp_SetNoteArchive
  @Id       UNIQUEIDENTIFIER,
  @Archived BIT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.Notes
     SET Archived  = @Archived,
         UpdatedAt = SYSUTCDATETIME()
   WHERE Id = @Id;
END;
GO

-- Categorías y relaciones
IF OBJECT_ID('dbo.sp_GetCategories', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetCategories;
GO
CREATE PROCEDURE dbo.sp_GetCategories
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, Name
    FROM dbo.Categories
   ORDER BY Name;
END;
GO

IF OBJECT_ID('dbo.sp_AddCategoryToNote', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_AddCategoryToNote;
GO
CREATE PROCEDURE dbo.sp_AddCategoryToNote
  @NoteId     UNIQUEIDENTIFIER,
  @CategoryId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (
      SELECT 1 FROM dbo.NoteCategories
       WHERE NoteId = @NoteId
         AND CategoryId = @CategoryId)
  BEGIN
    INSERT INTO dbo.NoteCategories (NoteId, CategoryId)
         VALUES (@NoteId, @CategoryId);
  END
END;
GO

IF OBJECT_ID('dbo.sp_RemoveCategoryFromNote', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_RemoveCategoryFromNote;
GO
CREATE PROCEDURE dbo.sp_RemoveCategoryFromNote
  @NoteId     UNIQUEIDENTIFIER,
  @CategoryId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM dbo.NoteCategories
   WHERE NoteId     = @NoteId
     AND CategoryId = @CategoryId;
END;
GO

-- === Autenticación de usuarios (TEXTO PLANO) ===

IF OBJECT_ID('dbo.sp_ValidateUser', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ValidateUser;
GO
CREATE PROCEDURE dbo.sp_ValidateUser
    @UserName NVARCHAR(100),
    @Password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM dbo.Users
         WHERE UserName = @UserName
           AND Password = @Password
    )
        SELECT 1 AS IsValid;
    ELSE
        SELECT 0 AS IsValid;
END;
GO

-- **¡DEVOLVÉ la base a MULTI_USER!**
ALTER DATABASE [NotesAppDb] SET MULTI_USER WITH ROLLBACK IMMEDIATE;
GO

PRINT 'Script completado: Base, tablas Notes/Categories/NoteCategories/Users, datos de prueba, triggers, SPs y autenticación admin/admin en texto plano creados correctamente.';
