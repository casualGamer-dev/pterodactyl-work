import React, { memo, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEthernet, faHdd, faMemory, faMicrochip, faServer, faCircle } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Server } from '@/api/server/getServer';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import tw, { TwStyle } from 'twin.macro';
import GreyRowBox from '@/components/elements/GreyRowBox';
import Spinner from '@/components/elements/Spinner';
import styled from 'styled-components';
import isEqual from 'react-fast-compare';
import CopyOnClick from '@/components/elements/CopyOnClick';
import { ServerContext } from '@/state/server';
const isAlarmState = (current: number, limit: number): boolean => limit > 0 && (current / (limit * 1024 * 1024) >= 0.90);

const Icon = memo(styled.div<{ $alarm: boolean }>`
  ${props => props.$alarm ? tw`text-red-400` : tw`text-neutral-500`};
`, isEqual);

const IconDescription = styled.p<{ $alarm: boolean }>`
  ${tw`text-sm ml-2 whitespace-nowrap`};
  ${props => props.$alarm ? tw`text-white` : tw`text-neutral-400`};
`;

const Stat = styled.p<{ $alarm: boolean }>`
  ${tw`text-sm`}
  ${props => props.$alarm ? tw`text-red-500` : tw`text-neutral-300`};
`;

const StatusIndicatorBox = styled(GreyRowBox) <{ $status: ServerPowerState | undefined; $bg: string }>`
${tw`flex flex-col w-full gap-4 relative p-0`};
    & .bg-image {
        ${({ $bg }) => `background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("${$bg}");`}
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }
    & .status {
        ${({ $status }) =>
            !$status || $status === 'offline'
                ? tw`text-red-600 bg-red-600`
                : $status === 'running'
                ? tw`text-green-600 bg-green-600`
                : tw`text-yellow-600 bg-yellow-600`};
    }
    & .status-text {
        ${({ $status }) =>
            !$status || $status === 'offline'
                ? tw`text-red-600`
                : $status === 'running'
                ? tw`text-green-600`
                : tw`text-yellow-600`};
    }
    &:hover .status-bar {
        ${tw`opacity-75`};
    }
`;

export default ({ server, className }: { server: Server; className?: string }) => {
  const interval = useRef<number>(null);
  const [isSuspended, setIsSuspended] = useState(server.status === 'suspended');
  const [stats, setStats] = useState<ServerStats | null>(null);

  const getStats = () => getServerResourceUsage(server.uuid)
    .then(data => setStats(data))
    .catch(error => console.error(error));

  useEffect(() => {
    setIsSuspended(stats ?.isSuspended || server.status === 'suspended');
  }, [stats ?.isSuspended, server.status]);

  useEffect(() => {
    
    if (isSuspended) return;

    getStats().then(() => {
      // @ts-ignore
      interval.current = setInterval(() => getStats(), 30000);
    });

    return () => {
      interval.current && clearInterval(interval.current);
    };
  }, [isSuspended]);

  const alarms = { cpu: false, memory: false, disk: false };
    if (stats) {
        alarms.cpu = server.limits.cpu === 0 ? false : stats.cpuUsagePercent >= server.limits.cpu * 0.9;
        alarms.memory = isAlarmState(stats.memoryUsageInBytes, server.limits.memory);
        alarms.disk = server.limits.disk === 0 ? false : isAlarmState(stats.diskUsageInBytes, server.limits.disk);
    }


  const diskLimit = server.limits.disk !== 0 ? bytesToString(mbToBytes(server.limits.disk)) : 'Unlimited';
  const memoryLimit = server.limits.memory !== 0 ? bytesToString(mbToBytes(server.limits.memory)) : 'Unlimited';
  const cpuLimit = server.limits.cpu !== 0 ? server.limits.cpu + ' %' : 'Unlimited';

  return (
       <>
        <StatusIndicatorBox as={Link} to={`/server/${server.id}`} className={className} $status={stats?.status}
            $bg={server.bg}>
            <div css={tw`flex items-center w-full px-16 py-10`} className='bg-image'>
            <div css={tw`w-full overflow-hidden truncate`}>
                    <div css={tw`flex flex-row-reverse sm:flex-col sm:justify-center justify-between items-center p-1`}>
                        <div css={tw`flex sm:mb-2`}>
                            <h2 css={tw`font-bold`}>
                                <span className='status-text'>
                                    {stats?.status === 'offline'
                                    ? 'Offline'
                                    : stats?.status === 'running'
                                    ? 'Running'
                                    : (stats?.status || 'Unknown')}
                                </span>
                            </h2>
                            <div css={tw`w-4 h-4 py-1 relative rounded-full ml-2`}>
                                <div css={tw`w-4 h-4 absolute rounded-full`} className="status"></div>
                                <div css={tw`w-4 h-4 animate-ping absolute rounded-full`} className="status"></div>
                            </div>
                        </div>
                        <p css={tw`text-3xl break-words sm:m-0`}>{server.name}</p>
                    </div>
                    {!!server.description && (
                        <p css={tw`truncate text-sm text-neutral-300 text-center`}>{server.description}</p>
                    )}
                </div>
            </div>
            <div
                css={tw`p-4 hidden sm:grid w-full items-center justify-items-center gap-4`}
                style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))"
                }}
            >
                {!stats || isSuspended ? (
                    isSuspended ? (
                        <div css={tw`flex-1 text-center`}>
                            <span css={tw`bg-red-500 rounded px-2 py-1 text-red-100 text-xs`}>
                                {server.status === 'suspended' ? 'Suspended' : 'Connection Error'}
                            </span>
                        </div>
                    ) : server.isTransferring || server.status ? (
                        <div css={tw`flex-1 text-center`}>
                            <span css={tw`bg-neutral-500 rounded px-2 py-1 text-neutral-100 text-xs`}>
                                {server.isTransferring
                                    ? 'Transferring'
                                    : server.status === 'installing'
                                    ? 'Installing'
                                    : server.status === 'restoring_backup'
                                    ? 'Restoring Backup'
                                    : 'Unavailable'}
                            </span>
                        </div>
                    ) : (
                        <Spinner size={'small'} />
                    )
                ) : (
                    <React.Fragment>

                        <Stat $alarm={alarms.cpu}>
                            CPU: {stats.cpuUsagePercent.toFixed()}%
                        </Stat>
                        <Stat $alarm={false}>
                            UUID: {server.id}
                        </Stat>
                        <Stat $alarm={alarms.memory}>
                            MEMORY: {bytesToString(stats.memoryUsageInBytes)} / {memoryLimit}
                        </Stat>
                        <Stat $alarm={alarms.disk}>
                            DISK: {bytesToString(stats.diskUsageInBytes)} / {diskLimit}
                        </Stat>
                        <Stat $alarm={false}>
                            {server.allocations
                                .filter((alloc) => alloc.isDefault)
                                .map((allocation) => (
                                    <React.Fragment key={allocation.ip + allocation.port.toString()}>
                                        IP: {allocation.alias || ip(allocation.ip)}:{allocation.port}
                                    </React.Fragment>
                                ))}
                        </Stat>
                    </React.Fragment>
                )}
            </div>
        </StatusIndicatorBox>
        

        </>
  );
};
