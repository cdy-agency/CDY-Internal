interface AccessDeniedProps {
  feature?: string;
}

export function AccessDenied({ feature }: AccessDeniedProps): JSX.Element {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-cdy-muted">
      <div className="text-5xl text-cdy-muted/60">🔒</div>
      <div className="text-lg font-medium text-cdy-white">Access denied</div>
      <p className="max-w-xs text-center text-sm leading-relaxed">
        {feature
          ? `You do not have permission to access ${feature}.`
          : 'You do not have permission to access this page.'}
        {' '}Contact your IT administrator to request access.
      </p>
    </div>
  );
}
