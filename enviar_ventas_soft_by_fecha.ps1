<#
  Envía las ventas de una FECHA específica (o de ayer si no se indica).
  Uso:
    .\enviar-ventas-por-fecha.ps1 -Date "2025-05-04"
    .\enviar-ventas-por-fecha.ps1            # usa ayer
  — Héctor, 2025-08-08
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Date
)

#--- Parámetros de conexión ----------------------------------------------------
$server     = "localhost,50364"
$database   = "softrestaurant11"
$user       = "impulsosaserver"
$password   = "admin2025"
$apiUrl     = "https://impulsorestauranteromercado-production.up.railway.app/api/ventasSoftsMasive"

#--- Determina la fecha base ---------------------------------------------------
# Si el usuario pasa -Date, debe ser YYYY-MM-DD
if ([string]::IsNullOrWhiteSpace($Date)) {
    $baseDate = (Get-Date).Date.AddDays(-1)   # ayer
} else {
    if ($Date -notmatch '^\d{4}-\d{2}-\d{2}$') {
        throw "El parámetro -Date debe ir en formato YYYY-MM-DD. Ejemplo: -Date `"2025-05-04`""
    }
    try {
        $baseDate = [datetime]::ParseExact(
            $Date,
            'yyyy-MM-dd',
            [System.Globalization.CultureInfo]::InvariantCulture
        )
    } catch {
        throw "No se pudo interpretar la fecha '$Date'. Verifica que exista (p. ej., evita 2025-02-30)."
    }
}

# Rango 00:00:00 → 23:59:59 de la fecha indicada
$startDateTime = $baseDate.ToString("yyyy-MM-dd'T'00:00:00")
$endDateTime   = $baseDate.ToString("yyyy-MM-dd'T'23:59:59")

Write-Host "⏰ Extrayendo ventas de:  $startDateTime  →  $endDateTime"

#--- Definición de consultas ---------------------------------------------------
$queryEmpresa = "SELECT empresa_id FROM dbo.configadonisempresa"

$queryVentas = @"
SELECT
    c.folio, c.mesa, c.total           AS total_cuenta,
    c.idturno, c.totalarticulos, c.efectivo, c.tarjeta, c.vales, c.otros,
    c.propina, c.totalconpropina, c.idtipodescuento,
    c.descuento                        AS descuento_cuenta,
    c.cancelado, cd.cantidad, cd.descuento,
    p.descripcion                      AS name_producto,
    cl.descripcion                     AS clasificacion,
    cd.precio, cd.impuesto1, cd.preciosinimpuestos, cd.preciocatalogo,
    cd.comentario, cd.idestacion, cd.idmeseroproducto,
    m.nombre                           AS name_mesero,
    t.apertura, t.cierre, t.cajero,
    t.efectivo                         AS turno_efectivo,
    t.vales                            AS turno_vales,
    t.tarjeta                          AS turno_tarjeta,
    t.credito, t.fondo
FROM   cheques      AS c
JOIN   turnos       AS t  ON c.idturno = t.idturno
LEFT   JOIN cheqdet AS cd ON c.folio   = cd.foliodet
JOIN   meseros      AS m  ON cd.idmeseroproducto = m.idmesero
JOIN   productos    AS p  ON cd.idproducto       = p.idproducto
JOIN   grupos       AS g  ON p.idgrupo           = g.idgrupo
JOIN   gruposiclasificacion AS cl ON g.clasificacion = cl.idgruposiclasificacion
WHERE  t.apertura >= '$startDateTime'
  AND  t.apertura <= '$endDateTime';
"@

#--- Abre conexión a SQL Server ----------------------------------------------
$connectionString = "Server=$server;Database=$database;User ID=$user;Password=$password;TrustServerCertificate=True;"
$connection       = [System.Data.SqlClient.SqlConnection]::new($connectionString)

try {
    $connection.Open()

    # 1️⃣  Obtiene empresa_id
    $cmdEmpresa             = $connection.CreateCommand()
    $cmdEmpresa.CommandText = $queryEmpresa
    $empresa_id             = $cmdEmpresa.ExecuteScalar()

    if (-not $empresa_id) { throw "No se encontró empresa_id en configadonisempresa." }
    Write-Host "🏢 Empresa ID: $empresa_id"

    # 2️⃣  Obtiene ventas
    $cmdVentas              = $connection.CreateCommand()
    $cmdVentas.CommandText  = $queryVentas
    $reader                 = $cmdVentas.ExecuteReader()

    $ventas = @()
    while ($reader.Read()) {
        $row = @{ }
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
            $col   = $reader.GetName($i)
            $value = $reader.GetValue($i)

            if ($value -is [DateTime]) { $value = $value.ToString("yyyy-MM-dd HH:mm:ss") }
            $row[$col] = $value
        }
        $ventas += $row
    }
    $reader.Close()
}
finally {
    $connection.Close()
}

#--- Envía a la API ------------------------------------------------------------
$payload = @{
    company_id   = $empresa_id
    ventas_softs = $ventas
} | ConvertTo-Json -Depth 5 -Compress

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $payload -ContentType "application/json"

    Write-Host "✅ Envío satisfactorio. Respuesta: $response"
}
catch {
    Write-Error "❌ Error al llamar la API: $_"
}
