import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPictureInPicture } from '@fortawesome/free-solid-svg-icons';
import '@/lib/fontawesome';

export function PictureInPictureIcon(props) {
  return (
    <FontAwesomeIcon
      icon={faPictureInPicture}
      aria-hidden="true"
      fixedWidth
      {...props}
    />
  );
}
