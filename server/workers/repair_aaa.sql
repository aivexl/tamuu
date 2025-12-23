-- Repair elements for template 'aaa'
INSERT INTO template_elements (id, section_id, type, name, position_x, position_y, width, height, z_index, animation, loop_animation, animation_delay, animation_speed, animation_duration, animation_trigger, content, image_url, text_style, icon_style, countdown_config, rsvp_form_config, guest_wishes_config, open_invitation_config, rotation, flip_horizontal, flip_vertical, motion_path_config, zoom_config, parallax_factor, can_edit_position, can_edit_content, is_content_protected, show_copy_button)
SELECT 
    'cl-' || target_s.type || '-' || substr(e.id, 1, 8),
    target_s.id, e.type, e.name, e.position_x, e.position_y, e.width, e.height,
    e.z_index, e.animation, e.loop_animation, e.animation_delay, e.animation_speed,
    e.animation_duration, e.animation_trigger, e.content, e.image_url, e.text_style,
    e.icon_style, e.countdown_config, e.rsvp_form_config, e.guest_wishes_config,
    e.open_invitation_config, e.rotation, e.flip_horizontal, e.flip_vertical,
    e.motion_path_config, e.zoom_config, e.parallax_factor,
    e.can_edit_position, e.can_edit_content, e.is_content_protected, e.show_copy_button
FROM template_elements e
JOIN template_sections source_s ON e.section_id = source_s.id
JOIN template_sections target_s ON source_s.type = target_s.type
WHERE source_s.template_id = 'f190cc52-8b4f-43e8-aafd-bf89a1284a1f'
AND target_s.template_id = 'e037e635-0129-4a2b-bee9-f7e157849935';
