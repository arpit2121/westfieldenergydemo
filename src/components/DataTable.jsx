import { useMemo, useState } from 'react';
import { Box, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Stack from './Stack';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { Empty } from './common';

/**
 * columns: [{ key, label, render?(row), align?, width?, search?(row)=>string }]
 * filters: [{ value, label, test(row) }]
 */
export default function DataTable({ columns, rows, onRowClick, empty, filters, searchable = true, toolbar, dense, rowSx }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState(filters?.[0]?.value || 'all');

  const shown = useMemo(() => {
    let r = rows;
    const flt = filters?.find((x) => x.value === f);
    if (flt?.test) r = r.filter(flt.test);
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((row) =>
        columns.some((c) => {
          const v = c.search ? c.search(row) : row[c.key];
          return v != null && String(v).toLowerCase().includes(s);
        }),
      );
    }
    return r;
  }, [rows, q, f, filters, columns]);

  return (
    <Box>
      {(searchable || filters || toolbar) && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', rowGap: 1 }}>
          {filters && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={f}
              onChange={(_, v) => v && setF(v)}
              sx={{ '& .MuiToggleButton-root': { fontSize: 11.5, py: 0.35, px: 1.25, textTransform: 'none', borderColor: 'grey.300', color: 'grey.600' }, '& .Mui-selected': { bgcolor: '#111 !important', color: '#fff !important' } }}
            >
              {filters.map((x) => (
                <ToggleButton key={x.value} value={x.value}>
                  {x.label}
                  <Box component="span" sx={{ ml: 0.75, opacity: 0.6 }}>
                    {x.test ? rows.filter(x.test).length : rows.length}
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          <Box sx={{ flex: 1 }} />
          {toolbar}
          {searchable && (
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, px: 1, height: 28, width: 220 }}>
              <SearchOutlined sx={{ fontSize: 15, color: 'grey.500' }} />
              <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" sx={{ fontSize: 12, flex: 1 }} />
            </Stack>
          )}
        </Stack>
      )}
      <TableContainer>
        <Table size="small" sx={dense ? { '& td': { py: 0.5 } } : undefined}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ width: c.width }}>
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((row, i) => (
              <TableRow
                key={row.id || i}
                hover={!!onRowClick}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{ cursor: onRowClick ? 'pointer' : 'default', ...(rowSx ? rowSx(row) : {}) }}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} align={c.align}>
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {shown.length === 0 && (empty || <Empty title="No records" hint={q ? 'Try a different filter.' : undefined} />)}
      {shown.length > 0 && (
        <Typography variant="caption" component="div" sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {shown.length} of {rows.length} records
        </Typography>
      )}
    </Box>
  );
}
