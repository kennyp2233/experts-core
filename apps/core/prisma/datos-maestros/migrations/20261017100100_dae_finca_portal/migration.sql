-- Las fincas también registran sus DAE en el portal del sistema nuevo: esas no
-- vienen de Access y no tienen codigoAccess.
ALTER TABLE "DaeFinca" ALTER COLUMN "codigoAccess" DROP NOT NULL;
