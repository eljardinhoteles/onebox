import { Table, Skeleton, Stack } from '@mantine/core';

interface TableSkeletonProps {
    rows?: number;
    cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
    return (
        <Table verticalSpacing="sm">
            <Table.Thead bg="gray.0">
                <Table.Tr>
                    {Array(cols).fill(0).map((_, i) => (
                        <Table.Th key={i}>
                            <Skeleton height={15} width="60%" radius="xl" />
                        </Table.Th>
                    ))}
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {Array(rows).fill(0).map((_, rowIndex) => (
                    <Table.Tr key={rowIndex}>
                        {Array(cols).fill(0).map((_, colIndex) => (
                            <Table.Td key={colIndex}>
                                <Stack gap={4}>
                                    <Skeleton height={12} width={colIndex === 0 ? "80%" : "40%"} radius="xl" />
                                    {colIndex === 0 && <Skeleton height={8} width="50%" radius="xl" opacity={0.5} />}
                                </Stack>
                            </Table.Td>
                        ))}
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}
