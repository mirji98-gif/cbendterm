import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { INSTRUCTIONS } from '../data/copy';
import { useSession } from '../machine/SessionContext';

export function Instructions(): JSX.Element {
  const { advance } = useSession();
  return (
    <Screen footer={<PrimaryButton onClick={() => advance()}>{INSTRUCTIONS.cta}</PrimaryButton>}>
      <Heading>{INSTRUCTIONS.title}</Heading>
      <p className="text-[15px] leading-relaxed text-neutral-700 mb-3">{INSTRUCTIONS.body}</p>
      <p className="text-[14px] leading-relaxed text-neutral-500">{INSTRUCTIONS.hint}</p>
    </Screen>
  );
}
