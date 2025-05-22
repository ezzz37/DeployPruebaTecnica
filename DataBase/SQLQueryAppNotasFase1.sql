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

IF OBJECT_ID('dbo.Notes', 'U') IS NOT NULL
    DROP TABLE dbo.Notes;
GO

CREATE TABLE dbo.Notes (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Notes PRIMARY KEY DEFAULT NEWID(),
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NULL,
    Archived BIT NOT NULL CONSTRAINT DF_Notes_Archived DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notes_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notes_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

INSERT INTO dbo.Notes (Id, Title, Content, Archived)
VALUES
  (NEWID(), 'Lista de compras', 'Leche, pan, huevos, café', 0),
  (NEWID(), 'Tareas del día', '1. Llamar al banco\n2. Enviar informe', 0),
  (NEWID(), 'Proyecto ASP.NET','Configurar Web API y ADO.NET', 1);
GO

IF OBJECT_ID('dbo.TR_Notes_UpdateTimestamp', 'TR') IS NOT NULL
    DROP TRIGGER dbo.TR_Notes_UpdateTimestamp;
GO

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

IF OBJECT_ID('dbo.sp_GetNotes', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetNotes;
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

IF OBJECT_ID('dbo.sp_GetNoteById', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetNoteById;
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

IF OBJECT_ID('dbo.sp_CreateNote', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CreateNote;
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

IF OBJECT_ID('dbo.sp_UpdateNote', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_UpdateNote;
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


IF OBJECT_ID('dbo.sp_DeleteNote', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_DeleteNote;
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

IF OBJECT_ID('dbo.sp_SetNoteArchive', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_SetNoteArchive;
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

IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = N'admin')
BEGIN
    CREATE LOGIN [admin] WITH PASSWORD = N'admin';
    PRINT 'SQL Server Login "admin" creado.';
END
ELSE
    PRINT 'SQL Server Login "admin" ya existe.';
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'admin')
BEGIN
    CREATE USER [admin] FOR LOGIN [admin];
    PRINT 'Database User "admin" creado.';
END
ELSE
    PRINT 'Database User "admin" ya existe.';
GO

GRANT EXECUTE ON SCHEMA::dbo TO [admin];
GO

PRINT 'FASE 1 completada: base, tabla, datos de prueba, trigger, SPs y credenciales (admin/admin) creados correctamente.';
